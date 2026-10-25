local state, cooldowns = {}, {}
local function clamp(v) return math.max(0, math.min(100, v)) end
local function getState(src) state[src] = state[src] or { psychology=100 }; return state[src] end
local function send(src) local s=getState(src); TriggerClientEvent('vorp_psychology:state',src,s.psychology) end
RegisterNetEvent('vorp_psychology:requestState', function() send(source) end)
RegisterNetEvent('vorp_psychology:addStress', function(amount)
    amount=tonumber(amount) or 0; if amount<0 or amount>25 then return end
    local s=getState(source); s.psychology=clamp(s.psychology-amount); send(source)
end)
-- Zombie resources can report proximity without depending on this resource's internals.
RegisterNetEvent('vorp_psychology:zombieNearby', function(isNearby)
    if isNearby then
        local s=getState(source); s.psychology=clamp(s.psychology-Config.StressPerTick.zombie); send(source)
    end
end)
RegisterNetEvent('vorp_psychology:reportKill', function(kind)
    if kind ~= 'zombie' and kind ~= 'player' then return end
    local s=getState(source); s.psychology=clamp(s.psychology-Config.KillPsychologyLoss[kind]); send(source)
end)
RegisterNetEvent('vorp_psychology:recover', function(kind)
    local src=source; local s=getState(src); local now=os.time(); cooldowns[src]=cooldowns[src] or {}
    local gain, cd = kind=='coffee' and Config.CoffeePsychologyGain or Config.CigarettePsychologyGain, kind=='coffee' and Config.CoffeeCooldown or Config.CigaretteCooldown
    if kind~='coffee' and kind~='cigarette' then return end
    if cooldowns[src][kind] and cooldowns[src][kind]>now then return end
    cooldowns[src][kind]=now+cd; s.psychology=clamp(s.psychology+gain); send(src)
end)
AddEventHandler('vorp_psychology:recoverFromRest', function(src,kind)
    local s=getState(src); s.psychology=clamp(s.psychology+(kind=='sleep' and Config.SleepPsychologyGain or Config.NapPsychologyGain)); send(src)
end)
AddEventHandler('playerDropped', function() state[source]=nil; cooldowns[source]=nil end)
