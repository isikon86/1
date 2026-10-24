local lastVisibility = nil
local hudEnabled = true
RegisterNetEvent('teot_survivalhud:setPsychology', function(psychology, sleep)
    SendNUIMessage({ action = 'psychology', psychology = psychology, sleep = sleep })
end)
RegisterNetEvent('teot_survivalhud:setSleep', function(sleep)
    SendNUIMessage({ action = 'sleep', sleep = sleep })
end)
local lastVoiceState = nil
local lastStatus = {
    health = nil,
    stamina = nil,
    hunger = nil,
    thirst = nil
}

local function clamp(value, low, high)
    value = tonumber(value)
    if not value then return low end
    if value < low then return low end
    if value > high then return high end
    return value
end

local function percentFromPoints(value)
    value = tonumber(value)
    if not value then return nil end

    -- RDR2 attributes can be returned on either a 0..100 or 0..1000 scale.
    if value > 100 then
        value = value / 10.0
    end

    return clamp(value, 0, 100)
end

local function getNeedValue(key)
    if GetResourceState('vorp_metabolism') ~= 'started' then
        return nil
    end

    local value = nil
    local ok = pcall(function()
        TriggerEvent('vorpmetabolism:getValue', key, function(result)
            value = tonumber(result)
        end)
    end)

    if not ok and Config.Debug then
        print(('[teot_survivalhud] Failed reading VORP need: %s'):format(key))
    end

    if value == nil and Config.Debug then
        print(('[teot_survivalhud] No VORP value received for %s'):format(key))
    end

    return value
end

local function getHealthPercent(ped)
    local maxHealth = GetEntityMaxHealth(ped)
    local health = GetEntityHealth(ped)

    if not maxHealth or maxHealth <= 0 then
        return nil
    end

    return clamp((health / maxHealth) * 100.0, 0, 100)
end

local function getStaminaPercent(ped)
    -- For the HUD ring we need the live, changing stamina state, not a static
    -- max/core pool. We first try the native that reports the current core
    -- fill (commonly 0..100); if unavailable, we fall back to attribute points.
    local ok, value = pcall(function()
        return GetAttributeCoreValue(ped, 1)
    end)

    if ok and value ~= nil then
        return percentFromPoints(value)
    end

    ok, value = pcall(function()
        return GetAttributePoints(ped, 1)
    end)

    if ok and value ~= nil then
        return percentFromPoints(value)
    end

    ok, value = pcall(function()
        return Citizen.InvokeNative(0x36731AC041289BB1, ped, 1)
    end)

    if ok and value ~= nil then
        return percentFromPoints(value)
    end

    return nil
end

local function updateStatus()
    local ped = PlayerPedId()
    if not ped or ped == 0 or not DoesEntityExist(ped) then return end

    local hunger = getNeedValue('Hunger')
    local thirst = getNeedValue('Thirst')

    if hunger ~= nil then
        lastStatus.hunger = clamp((hunger / Config.NeedsMaxValue) * 100.0, 0, 100)
    end
    if thirst ~= nil then
        lastStatus.thirst = clamp((thirst / Config.NeedsMaxValue) * 100.0, 0, 100)
    end

    lastStatus.health = getHealthPercent(ped)
    lastStatus.stamina = getStaminaPercent(ped)

    SendNUIMessage({
        action = 'update',
        health = lastStatus.health,
        stamina = lastStatus.stamina,
        hunger = lastStatus.hunger,
        thirst = lastStatus.thirst
    })
end


local function getTemperatureRisk(ped)
    if not Config.TemperatureEnabled then
        return nil, 0, 0
    end

    local coords = GetEntityCoords(ped)
    local ok, rawTemperature = pcall(function()
        -- RedM/RDR3 ambient temperature native returns Celsius.
        return GetTemperatureAtCoords(coords.x, coords.y, coords.z)
    end)

    if not ok or rawTemperature == nil then
        if Config.Debug then
            print('[teot_survivalhud] Ambient temperature native unavailable.')
        end
        return nil, 0, 0
    end

    local temperature = tonumber(rawTemperature)
    if not temperature then return nil, 0, 0 end

    local coldStart = tonumber(Config.ColdStartC) or 8.0
    local coldCritical = tonumber(Config.ColdCriticalC) or -5.0
    local heatStart = tonumber(Config.HeatStartC) or 28.0
    local heatCritical = tonumber(Config.HeatCriticalC) or 40.0

    if coldCritical >= coldStart then coldCritical = coldStart - 1.0 end
    if heatCritical <= heatStart then heatCritical = heatStart + 1.0 end

    local coldRisk = 0.0
    if temperature < coldStart then
        coldRisk = clamp(((coldStart - temperature) / (coldStart - coldCritical)) * 100.0, 0, 100)
    end

    local heatRisk = 0.0
    if temperature > heatStart then
        heatRisk = clamp(((temperature - heatStart) / (heatCritical - heatStart)) * 100.0, 0, 100)
    end

    return temperature, coldRisk, heatRisk
end

local function updateTemperature()
    local ped = PlayerPedId()
    if not ped or ped == 0 or not DoesEntityExist(ped) then return end

    local temperature, coldRisk, heatRisk = getTemperatureRisk(ped)
    SendNUIMessage({
        action = 'temperature',
        temperature = temperature,
        cold = coldRisk,
        heat = heatRisk,
        coldStart = tonumber(Config.ColdStartC) or 8.0,
        heatStart = tonumber(Config.HeatStartC) or 28.0
    })
end

local function hideVorpMetabolismHud()
    if not Config.HideVorpMetabolismHud then return end

    if GetResourceState('vorp_metabolism') == 'started' then
        -- This VORP event toggles only its NUI visibility. Hunger/thirst
        -- drain, item use, and saving remain handled by vorp_metabolism.
        TriggerEvent('vorpmetabolism:setHud', false)
    end
end

local function getTalkingState()
    -- pma-voice uses MumbleIsPlayerTalking in the resource included in the
    -- uploaded resources archive. The fallback supports other voice setups.
    if GetResourceState('pma-voice') == 'started' then
        local ok, result = pcall(function()
            return MumbleIsPlayerTalking(PlayerId())
        end)

        if ok then
            return result == true or result == 1
        end
    end

    local ok, result = pcall(function()
        return NetworkIsPlayerTalking(PlayerId())
    end)

    if ok then
        return result == true or result == 1
    end

    return false
end

local function refreshHudVisibility()
    local visible = hudEnabled
    if Config.HideInPauseMenu and IsPauseMenuActive() then
        visible = false
    end

    if visible ~= lastVisibility then
        lastVisibility = visible
        SendNUIMessage({ action = visible and 'show' or 'hide' })
    end
end

RegisterCommand(Config.ToggleCommand or 'hud', function()
    hudEnabled = not hudEnabled
    refreshHudVisibility()
    TriggerEvent('chat:addMessage', {
        color = { 205, 161, 91 },
        args = { 'TEOT HUD', hudEnabled and 'HUD включён' or 'HUD скрыт' }
    })
end, false)

RegisterKeyMapping(Config.ToggleCommand or 'hud', 'Показать/скрыть TEOT HUD', 'keyboard', Config.ToggleKey or 'F7')

CreateThread(function()
    Wait(1000)

    while true do
        if Config.HideRadar then
            DisplayRadar(false)
        end

        refreshHudVisibility()
        Wait(0)
    end
end)

CreateThread(function()
    while true do
        hideVorpMetabolismHud()
        Wait(1500)
    end
end)

CreateThread(function()
    while true do
        updateStatus()
        Wait(Config.UpdateInterval)
    end
end)

CreateThread(function()
    while true do
        updateTemperature()
        Wait(Config.TemperatureUpdateInterval or 1000)
    end
end)

CreateThread(function()
    while true do
        local talking = getTalkingState()

        if talking ~= lastVoiceState then
            lastVoiceState = talking
            SendNUIMessage({
                action = 'microphone',
                talking = talking
            })
        end

        Wait(Config.VoiceUpdateInterval)
    end
end)

AddEventHandler('onClientResourceStart', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end

    CreateThread(function()
        Wait(1500)
        hideVorpMetabolismHud()
        updateStatus()
        updateTemperature()
        SendNUIMessage({ action = 'show' })
    end)
end)

RegisterNetEvent('vorp:SelectedCharacter', function()
    CreateThread(function()
        Wait(1500)
        hideVorpMetabolismHud()
        updateStatus()
        updateTemperature()
        SendNUIMessage({ action = 'show' })
    end)
end)

RegisterNetEvent('vorp_core:Client:OnPlayerSpawned', function()
    CreateThread(function()
        Wait(1000)
        hideVorpMetabolismHud()
        updateStatus()
        updateTemperature()
        SendNUIMessage({ action = 'show' })
    end)
end)

AddEventHandler('onClientResourceStop', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end
    SendNUIMessage({ action = 'hide' })
end)
