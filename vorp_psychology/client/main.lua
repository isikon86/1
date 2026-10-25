local psychology = 100
local reportedDeaths = {}
local lightHashes = {}
for _, model in ipairs(Config.LightModels) do lightHashes[GetHashKey(model)] = true end
local function isNearLight()
    local p=GetEntityCoords(PlayerPedId())
    for _, object in ipairs(GetGamePool('CObject') or {}) do
        if DoesEntityExist(object) and lightHashes[GetEntityModel(object)] and #(p-GetEntityCoords(object)) <= Config.LightProtectionRadius then return true end
    end
    return false
end
local function isNight(h) return h>=Config.NightStart or h<Config.NightEnd end
RegisterNetEvent('vorp_psychology:state',function(value) psychology=value; TriggerEvent('teot_survivalhud:setPsychology', psychology, 100) end)
CreateThread(function() Wait(1000); TriggerServerEvent('vorp_psychology:requestState') end)
CreateThread(function()
    while true do
        local protected=isNearLight()
        TriggerServerEvent('vorp_psychology:lightState', protected)
        Wait(1000)
    end
end)
AddEventHandler('gameEventTriggered', function(name, args)
    if name ~= 'CEventNetworkEntityDamage' then return end
    local victim, attacker = args[1], args[2]
    local ped = PlayerPedId()
    if attacker ~= ped or not DoesEntityExist(victim) or victim == ped or not IsEntityDead(victim) then return end
    if reportedDeaths[victim] then return end
    reportedDeaths[victim] = true
    TriggerServerEvent('vorp_psychology:reportKill', IsPedAPlayer(victim) and 'player' or 'zombie')
    SetTimeout(15000, function() reportedDeaths[victim] = nil end)
end)
CreateThread(function()
    while true do
        Wait(Config.TickSeconds*1000)
        if IsPedShooting(PlayerPedId()) then TriggerServerEvent('vorp_psychology:addStress',Config.StressPerTick.shooting) end
        if isNight(GetClockHours()) then
            TriggerServerEvent('vorp_psychology:addStress',Config.StressPerTick.night)
        else
            TriggerServerEvent('vorp_psychology:addStress',Config.StressPerTick.day)
        end
        if Config.BloodMoon then TriggerServerEvent('vorp_psychology:addStress',Config.StressPerTick.bloodMoon) end
    end
end)
CreateThread(function()
    while true do
        Wait(1000)
        if psychology < Config.StaminaDrainBelow and IsPedSprinting(PlayerPedId()) then
            local stamina = GetPlayerStamina(PlayerId())
            SetPlayerStamina(PlayerId(), math.max(0.0, stamina - ((Config.StaminaDrainBelow - psychology) * Config.StaminaDrainPerSecond)))
        end
    end
end)
CreateThread(function()
    while true do
        Wait(0)
        if psychology<60 and IsPlayerFreeAiming(PlayerId()) then ShakeGameplayCam('HAND_SHAKE',(60-psychology)/300.0) end
        if psychology<40 then SetTimecycleModifier('spectator5'); SetTimecycleModifierStrength((40-psychology)/100.0) else ClearTimecycleModifier() end
    end
end)
RegisterNetEvent('vorp_psychology:useCoffee',function() TriggerServerEvent('vorp_psychology:recover','coffee') end)
RegisterNetEvent('vorp_psychology:useCigarette',function() TriggerServerEvent('vorp_psychology:recover','cigarette') end)
