local sleep, resting, restStartedAt = 100, false, 0
local bedHashes, campfireHashes, nearbyObjects = {}, {}, { bed=nil, campfire=nil }
for _, model in ipairs(Config.BedModels) do bedHashes[GetHashKey(model)] = true end
for _, model in ipairs(Config.CampfireModels) do campfireHashes[GetHashKey(model)] = true end
local function notify(msg) TriggerEvent('vorp:TipRight', msg, 2500) end
local function scanObjects()
    local p=GetEntityCoords(PlayerPedId()); nearbyObjects.bed=nil; nearbyObjects.campfire=nil
    for _, object in ipairs(GetGamePool('CObject') or {}) do
        if DoesEntityExist(object) then
            local model=GetEntityModel(object); local distance= #(p-GetEntityCoords(object))
            if distance <= Config.InteractionDistance then
                if bedHashes[model] then nearbyObjects.bed=object elseif campfireHashes[model] then nearbyObjects.campfire=object end
            end
        end
    end
end
CreateThread(function() while true do scanObjects(); Wait(Config.ObjectScanInterval) end end)
RegisterNetEvent('vorp_sleep:state',function(s) sleep=s; TriggerEvent('teot_survivalhud:setSleep', sleep) end)
CreateThread(function() Wait(1000); TriggerServerEvent('vorp_sleep:requestState') end)
local function playRestAnimation(kind)
    local a = kind == 'sleep' and Config.BedAnimation or Config.CampfireAnimation
    local ped = PlayerPedId()
    ClearPedTasksImmediately(ped)
    RequestAnimDict(a.dict)
    local timeout = GetGameTimer() + 10000
    while not HasAnimDictLoaded(a.dict) and GetGameTimer() < timeout do Wait(0) end
    if not HasAnimDictLoaded(a.dict) then
        print(('[vorp_sleep] Animation dictionary failed: %s'):format(a.dict))
        return false
    end
    TaskPlayAnim(ped, a.dict, a.name, 1.0, 8.0, -1, 31, 0.0, false, false, false)
    Wait(250)
    if not IsEntityPlayingAnim(ped, a.dict, a.name, 3) then
        print(('[vorp_sleep] Animation failed: %s/%s'):format(a.dict, a.name))
        return false
    end
    return true
end
local function drawRestOverlay()
    local elapsed = (GetGameTimer() - restStartedAt) / 1000.0
    local fade = math.max(0.0, math.min(1.0, elapsed / Config.FadeDelay))
    local a = math.floor(Config.OverlayAlpha * fade)
    DrawRect(0.5, 0.08, 1.0, 0.16, 0, 0, 0, a)
    DrawRect(0.5, 0.92, 1.0, 0.16, 0, 0, 0, a)
    DrawRect(0.08, 0.5, 0.16, 0.68, 0, 0, 0, a)
    DrawRect(0.92, 0.5, 0.16, 0.68, 0, 0, 0, a)
end
local function rest(kind)
    if resting then return end
    resting=true; restStartedAt=GetGameTimer(); playRestAnimation(kind); notify(kind == 'sleep' and 'Вы легли спать. Нажмите X, чтобы проснуться.' or 'Вы задремали. Нажмите X, чтобы проснуться.')
    local untilTime = GetGameTimer() + (kind=='sleep' and Config.SleepDuration or Config.NapDuration) * 1000
    while resting and GetGameTimer() < untilTime do
        Wait(0)
        if IsControlJustReleased(0, Config.CancelKey) then resting=false end
    end
    ClearPedTasks(PlayerPedId())
    if GetGameTimer() >= untilTime then TriggerServerEvent('vorp_sleep:recover',kind); notify('Вы проснулись и чувствуете себя лучше.') else notify('Сон прерван.') end
end
CreateThread(function()
    local lastPrompt = 0
    while true do
        Wait(0)
        if resting then drawRestOverlay()
        else
            local now = GetGameTimer(); local bed, fire = nearbyObjects.bed, nearbyObjects.campfire
            if bed or fire then
                if now > lastPrompt then notify(bed and 'Нажмите E, чтобы лечь спать.' or 'Нажмите E, чтобы дремать.'); lastPrompt = now + 2500 end
                if IsControlJustReleased(0, Config.InteractionKey) then rest(bed and 'sleep' or 'nap') end
            end
        end
    end
end)

RegisterCommand('sleep_object', function()
    local p=GetEntityCoords(PlayerPedId()); local closest, distance
    for _, object in ipairs(GetGamePool('CObject')) do
        local d= #(p-GetEntityCoords(object)); if not distance or d<distance then closest,distance=object,d end
    end
    if closest then notify(('Модель объекта: %s | hash: %s'):format(GetEntityModel(closest), GetEntityModel(closest))) end
end, false)

-- Test commands are useful while configuring map objects.
RegisterCommand('sleep_test', function() rest('sleep') end, false)
RegisterCommand('nap_test', function() rest('nap') end, false)
