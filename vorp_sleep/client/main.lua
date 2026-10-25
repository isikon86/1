local seatHashes = {}
local bedHashes = {}
local nearestInteraction = nil
local usingFurniture = false
local activeInteraction = nil
local restStartedAt = 0
local restKind = nil
local restRecovered = false
local debugEnabled = Config.Debug

local sitPrompt = nil
local liePrompt = nil
local standPrompt = nil
local promptGroup = GetRandomIntInRange(0, 0xffffff)

local function createVarString(text)
    return Citizen.InvokeNative(0xFA925AC00EB830B9, 10, 'LITERAL_STRING', text, Citizen.ResultAsLong())
end

local function createPrompt(control, text, holdMode)
    local prompt = Citizen.InvokeNative(0x04F97DE45A519419, Citizen.ResultAsLong())
    Citizen.InvokeNative(0xB5352B7494A08258, prompt, control)
    Citizen.InvokeNative(0x5DD02A8318420DD7, prompt, createVarString(text))
    Citizen.InvokeNative(0x8A0FB4D03A630D21, prompt, true)
    Citizen.InvokeNative(0x71215ACCFDE075EE, prompt, true)
    if holdMode then
        -- Native RedM hold-mode prompt. Using a separate mode avoids accidental bed activation.
        PromptSetHoldMode(prompt, true)
    else
        Citizen.InvokeNative(0xCC6656799977741B, prompt, true)
    end
    Citizen.InvokeNative(0x2F11D3A254169EA4, prompt, promptGroup, 0)
    Citizen.InvokeNative(0xF7AA2696A22AD8B9, prompt)
    return prompt
end

local function setPromptVisible(prompt, state)
    if prompt then
        Citizen.InvokeNative(0x8A0FB4D03A630D21, prompt, state)
        Citizen.InvokeNative(0x71215ACCFDE075EE, prompt, state)
    end
end


local function deletePrompt(prompt)
    if prompt then
        Citizen.InvokeNative(0x00EDE88D4D13CF59, prompt)
    end
end

local function ensureLiePrompt()
    if not liePrompt then
        liePrompt = createPrompt(Config.SitControl, Config.LiePromptText or 'Лечь', true)
        setPromptVisible(liePrompt, true)
    end
end

local function removeLiePrompt()
    if liePrompt then
        deletePrompt(liePrompt)
        liePrompt = nil
    end
end

local function promptCompleted(prompt)
    return prompt and Citizen.InvokeNative(0xC92AC953F0A982AE, prompt)
end

local function holdPromptCompleted(prompt)
    return prompt and PromptHasHoldModeCompleted(prompt)
end

local function showPromptGroup(label)
    Citizen.InvokeNative(0xC65A45D4453C2627, promptGroup, createVarString(label), 1, 0, 0, 0)
end

local function vecDistance(a, b)
    local dx = a.x - b.x
    local dy = a.y - b.y
    local dz = a.z - b.z
    return math.sqrt(dx * dx + dy * dy + dz * dz)
end

local function buildHashLookups()
    seatHashes = {}
    bedHashes = {}

    for modelName, seatType in pairs(Config.Seats) do
        seatHashes[GetHashKey(modelName)] = { model = modelName, type = seatType }
    end

    for modelName, bedType in pairs(Config.Beds or {}) do
        bedHashes[GetHashKey(modelName)] = { model = modelName, type = bedType }
    end

    -- Numeric hashes are useful for world props whose model names are unknown.
    for modelHash, bedData in pairs(Config.BedHashes or {}) do
        local bedType = type(bedData) == 'table' and bedData.type or bedData
        bedHashes[tonumber(modelHash)] = {
            model = type(bedData) == 'table' and (bedData.model or ('hash_' .. tostring(modelHash))) or ('hash_' .. tostring(modelHash)),
            type = bedType
        }
    end
end

local function getSeatSettings(modelName, seatType)
    local defaults = Config.SeatTypes[seatType] or Config.SeatTypes.chair
    local override = Config.ModelOverrides[modelName] or {}

    return {
        scenario = override.scenario or defaults.scenario,
        x = override.x ~= nil and override.x or defaults.x,
        y = override.y ~= nil and override.y or defaults.y,
        z = override.z ~= nil and override.z or defaults.z,
        heading = override.heading ~= nil and override.heading or defaults.heading
    }
end

local function getBedSettings(modelName, bedType)
    local defaults = Config.BedTypes[bedType] or Config.BedTypes.bed
    local override = (Config.BedOverrides or {})[modelName] or {}
    return {
        scenario = override.scenario or defaults.scenario,
        slots = override.slots or defaults.slots
    }
end

local function makeWorldTarget(entity, slot)
    local pos = GetOffsetFromEntityInWorldCoords(entity, slot.x or 0.0, slot.y or 0.0, slot.z or 0.0)
    return pos, GetEntityHeading(entity) + (slot.heading or 0.0)
end

-- One object-pool pass finds both seats and beds, so adding beds does not add a second scan.
local function findNearestInteraction(ped)
    local playerCoords = GetEntityCoords(ped)
    local best = nil
    local bestDistance = math.max(Config.InteractDistance, Config.BedInteractDistance or 2.0) + 0.001
    local objects = GetGamePool('CObject')

    for i = 1, #objects do
        local object = objects[i]
        if DoesEntityExist(object) then
            local hash = GetEntityModel(object)
            local seatData = seatHashes[hash]
            local bedData = bedHashes[hash]

            if seatData then
                local objectCoords = GetEntityCoords(object)
                local distance = vecDistance(playerCoords, objectCoords)
                if distance <= Config.InteractDistance and distance < bestDistance then
                    bestDistance = distance
                    best = {
                        kind = 'seat',
                        entity = object,
                        distance = distance,
                        model = seatData.model,
                        type = seatData.type
                    }
                end
            elseif bedData then
                local settings = getBedSettings(bedData.model, bedData.type)
                for slotIndex, slot in ipairs(settings.slots or {}) do
                    local targetPos = makeWorldTarget(object, slot)
                    local distance = vecDistance(playerCoords, targetPos)
                    if distance <= (Config.BedInteractDistance or 2.0) and distance < bestDistance then
                        bestDistance = distance
                        best = {
                            kind = 'bed',
                            entity = object,
                            distance = distance,
                            model = bedData.model,
                            type = bedData.type,
                            slot = slotIndex
                        }
                    end
                end
            end
        end
    end

    return best
end

local function standUp()
    local ped = PlayerPedId()
    local wasBed = activeInteraction and activeInteraction.kind == 'bed'

    -- Bed scenarios have their own built-in exit transitions. A normal
    -- ClearPedTasks() lets that transition play and some beds briefly move
    -- the player into a seated pose. Clear it immediately instead so Lie
    -- Down -> Stand returns directly to an upright player.
    if wasBed then
        ClearPedTasksImmediately(ped)
        FreezeEntityPosition(ped, false)
        Wait(50)
        ClearPedTasksImmediately(ped)
    else
        ClearPedTasks(ped)
        FreezeEntityPosition(ped, false)
    end

    usingFurniture = false
    activeInteraction = nil
    nearestInteraction = nil
    restStartedAt = 0
    restKind = nil
    restRecovered = false
    Wait(wasBed and 150 or 400)
end

local function useSeat(interaction)
    local settings = getSeatSettings(interaction.model, interaction.type)
    local pos = GetOffsetFromEntityInWorldCoords(interaction.entity, settings.x, settings.y, settings.z)
    local heading = GetEntityHeading(interaction.entity) + settings.heading

    TaskStartScenarioAtPosition(
        PlayerPedId(), GetHashKey(settings.scenario),
        pos.x, pos.y, pos.z, heading,
        -1, true, true
    )
end

local function useBed(interaction)
    local settings = getBedSettings(interaction.model, interaction.type)
    local slot = settings.slots[interaction.slot or 1]
    if not slot then return false end

    local ped = PlayerPedId()
    local pos, heading = makeWorldTarget(interaction.entity, slot)

    -- Beds intentionally use a dedicated path instead of the chair behavior.
    -- Position and freeze first, then start the native sleeping scenario using
    -- the same flags used by established RedM furniture interaction resources.
    ClearPedTasksImmediately(ped)
    SetEntityCoordsNoOffset(ped, pos.x, pos.y, pos.z, false, false, false)
    SetEntityHeading(ped, heading)
    FreezeEntityPosition(ped, true)
    Wait(50)

    TaskStartScenarioAtPosition(
        ped, GetHashKey(settings.scenario),
        pos.x, pos.y, pos.z, heading,
        -1, false, true
    )
    return true
end

local function startInteraction(interaction)
    if not interaction or not DoesEntityExist(interaction.entity) then return end

    local ped = PlayerPedId()
    if IsEntityDead(ped) or IsPedOnMount(ped) or IsPedInAnyVehicle(ped, false) then return end

    ClearPedTasksImmediately(ped)

    local started = true
    if interaction.kind == 'bed' then
        started = useBed(interaction)
    else
        useSeat(interaction)
    end

    if started then
        activeInteraction = interaction
        usingFurniture = true
        restKind = interaction.kind == 'bed' and 'sleep' or 'nap'
        restStartedAt = GetGameTimer()
        restRecovered = false
    end
end

local function findClosestObjectForDebug(ped, radius)
    local playerCoords = GetEntityCoords(ped)
    local bestEntity = nil
    local bestDistance = radius + 0.001
    local objects = GetGamePool('CObject')

    for i = 1, #objects do
        local object = objects[i]
        if DoesEntityExist(object) then
            local distance = vecDistance(playerCoords, GetEntityCoords(object))
            if distance < bestDistance then
                bestDistance = distance
                bestEntity = object
            end
        end
    end

    return bestEntity, bestDistance
end

RegisterCommand('sitdebug', function()
    debugEnabled = not debugEnabled
    print(('[vorp_sleep] Отладка: %s'):format(debugEnabled and 'ВКЛЮЧЕНА' or 'ВЫКЛЮЧЕНА'))

    if debugEnabled then
        local object, distance = findClosestObjectForDebug(PlayerPedId(), 3.0)
        if object then
            local model = GetEntityModel(object)
            local kind = seatHashes[model] and 'seat' or (bedHashes[model] and 'bed' or 'unsupported')
            print(('[vorp_sleep] Ближайший объект: entity=%s modelHash=%s distance=%.2f type=%s'):format(object, model, distance, kind))
            print('[vorp_sleep] Если это нужный объект, сохраните его modelHash.')
        else
            print('[vorp_sleep] В радиусе 3 метров объект не найден.')
        end
    end
end, false)

local function printNearbyObjects(radius, limit)
    local ped = PlayerPedId()
    local playerCoords = GetEntityCoords(ped)
    local found = {}
    local objects = GetGamePool('CObject')

    for i = 1, #objects do
        local object = objects[i]
        if DoesEntityExist(object) then
            local coords = GetEntityCoords(object)
            local distance = vecDistance(playerCoords, coords)
            if distance <= radius then
                local model = GetEntityModel(object)
                found[#found + 1] = {
                    entity = object,
                    model = model,
                    distance = distance,
                    kind = seatHashes[model] and 'seat' or (bedHashes[model] and 'bed' or 'unsupported')
                }
            end
        end
    end

    table.sort(found, function(a, b) return a.distance < b.distance end)

    print(('[vorp_sleep] Объекты в радиусе %.2f м:'):format(radius))
    local count = math.min(#found, limit)
    if count == 0 then
        print('[vorp_sleep]   нет объектов')
        return
    end

    for i = 1, count do
        local item = found[i]
        print(('[vorp_sleep]   #%d entity=%s modelHash=%s distance=%.2f type=%s'):format(
            i, item.entity, item.model, item.distance, item.kind
        ))
    end
end

RegisterCommand('sitnearby', function()
    printNearbyObjects(2.5, 12)
end, false)

RegisterCommand('sitstatus', function()
    local ped = PlayerPedId()
    if nearestInteraction and DoesEntityExist(nearestInteraction.entity) then
        local liveDistance = vecDistance(GetEntityCoords(ped), GetEntityCoords(nearestInteraction.entity))
        print(('[vorp_sleep] статус: используется=%s тип=%s модель=%s entity=%s дистанция=%.2f текущаяДистанция=%.2f'):format(
            tostring(usingFurniture), tostring(nearestInteraction.kind), tostring(nearestInteraction.model),
            tostring(nearestInteraction.entity), tonumber(nearestInteraction.distance or -1), liveDistance
        ))
    else
        print(('[vorp_sleep] статус: объект отсутствует, используется=%s promptЛечь=%s'):format(
            tostring(usingFurniture), tostring(liePrompt ~= nil)
        ))
    end
end, false)

RegisterCommand('stand', function()
    if usingFurniture then standUp() end
end, false)

CreateThread(function()
    buildHashLookups()

    sitPrompt = createPrompt(Config.SitControl, Config.PromptText)
    standPrompt = createPrompt(Config.SitControl, Config.StandPromptText)
    setPromptVisible(sitPrompt, false)
    setPromptVisible(standPrompt, false)

    local seatCount, bedCount = 0, 0
    for _ in pairs(Config.Seats) do seatCount = seatCount + 1 end
    for _ in pairs(Config.Beds or {}) do bedCount = bedCount + 1 end
    for _ in pairs(Config.BedHashes or {}) do bedCount = bedCount + 1 end
    print(('[vorp_sleep] Загружено моделей для сидения: %d, моделей кроватей: %d.'):format(seatCount, bedCount))
end)

CreateThread(function()
    while true do
        if not usingFurniture then
            local ped = PlayerPedId()
            if DoesEntityExist(ped)
                and not IsEntityDead(ped)
                and not IsPedOnMount(ped)
                and not IsPedInAnyVehicle(ped, false) then
                nearestInteraction = findNearestInteraction(ped)
            else
                nearestInteraction = nil
            end
        else
            nearestInteraction = nil
        end
        Wait(Config.ScanInterval)
    end
end)

CreateThread(function()
    while true do
        local waitTime = 250
        local ped = PlayerPedId()

        if usingFurniture then
            waitTime = 0
            setPromptVisible(sitPrompt, false)
                    setPromptVisible(standPrompt, true)
            showPromptGroup(activeInteraction and activeInteraction.kind == 'bed' and (Config.BedPromptGroupText or 'Кровать') or Config.PromptGroupText)

            local required = (restKind == 'sleep' and Config.SleepDuration or Config.NapDuration) * 1000
            if not restRecovered and restStartedAt > 0 and GetGameTimer() - restStartedAt >= required then
                restRecovered = true
                TriggerServerEvent('vorp_sleep:recover', restKind)
                TriggerEvent('vorp:TipRight', restKind == 'sleep' and 'Сон завершён.' or 'Дремота завершена.', 3000)
            end

            if Config.ToggleToStand and (promptCompleted(standPrompt) or IsControlJustPressed(0, Config.SitControl)) then
                standUp()
            elseif Config.AllowCancelToStand and IsControlJustPressed(0, Config.CancelControl) then
                standUp()
            elseif IsEntityDead(ped) then
                usingFurniture = false
                activeInteraction = nil
                FreezeEntityPosition(ped, false)
            elseif activeInteraction and not DoesEntityExist(activeInteraction.entity) then
                standUp()
            end
        elseif nearestInteraction and DoesEntityExist(nearestInteraction.entity) then
            waitTime = 0
            setPromptVisible(standPrompt, false)

            local isBed = nearestInteraction.kind == 'bed'
            setPromptVisible(sitPrompt, not isBed)
            if isBed then
                ensureLiePrompt()
                showPromptGroup(Config.BedPromptGroupText or 'Кровать')
            else
                removeLiePrompt()
                showPromptGroup(Config.PromptGroupText)
            end

            if isBed then
                -- The Lie Down prompt is dynamically created only while a bed is targetable.
                -- This avoids RedM retaining a hidden hold prompt on the HUD after leaving a bed.
                if holdPromptCompleted(liePrompt) then
                    removeLiePrompt()
                    startInteraction(nearestInteraction)
                end
            elseif promptCompleted(sitPrompt) or IsControlJustPressed(0, Config.SitControl) then
                startInteraction(nearestInteraction)
            end
        else
            setPromptVisible(sitPrompt, false)
            setPromptVisible(standPrompt, false)
            removeLiePrompt()
        end

        Wait(waitTime)
    end
end)

CreateThread(function()
    while true do
        if debugEnabled then
            local object, distance = findClosestObjectForDebug(PlayerPedId(), 2.25)
            if object then
                local model = GetEntityModel(object)
                local kind = seatHashes[model] and 'seat' or (bedHashes[model] and 'bed' or 'unsupported')
                print(('[vorp_sleep] ближайший объект modelHash=%s distance=%.2f type=%s'):format(model, distance, kind))
            end
            Wait(2500)
        else
            Wait(1000)
        end
    end
end)

AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end

    local ped = PlayerPedId()
    if usingFurniture then
        ClearPedTasksImmediately(ped)
        FreezeEntityPosition(ped, false)
    end

    if sitPrompt then Citizen.InvokeNative(0x00EDE88D4D13CF59, sitPrompt) end
    removeLiePrompt()
    if standPrompt then Citizen.InvokeNative(0x00EDE88D4D13CF59, standPrompt) end
end)
