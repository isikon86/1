local psychology = 100
local function isNight(h) return h>=Config.NightStart or h<Config.NightEnd end
RegisterNetEvent('vorp_psychology:state',function(value) psychology=value end)
CreateThread(function() Wait(1000); TriggerServerEvent('vorp_psychology:requestState') end)
CreateThread(function()
    while true do
        Wait(Config.TickSeconds*1000)
        if IsPedShooting(PlayerPedId()) then TriggerServerEvent('vorp_psychology:addStress',Config.StressPerTick.shooting) end
        if isNight(GetClockHours()) then TriggerServerEvent('vorp_psychology:addStress',Config.StressPerTick.night) end
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
