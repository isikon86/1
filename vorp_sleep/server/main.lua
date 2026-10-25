local state = {}
local lastDrain = {}
local function clamp(v) return math.max(0, math.min(100, v)) end
local function getState(src) state[src] = state[src] or { sleep=100 }; return state[src] end
RegisterNetEvent('vorp_sleep:requestState', function() local s=getState(source); TriggerClientEvent('vorp_sleep:state',source,s.sleep) end)
RegisterNetEvent('vorp_sleep:drainTick', function()
    local src=source; local now=os.time(); local s=getState(src)
    if lastDrain[src] and now-lastDrain[src] < (Config.SleepDrainInterval - 5) then return end
    lastDrain[src]=now; s.sleep=clamp(s.sleep-Config.SleepDrainAmount)
    TriggerClientEvent('vorp_sleep:state',src,s.sleep)
end)
RegisterNetEvent('vorp_sleep:recover', function(kind)
    local src=source; local s=getState(src); local gain=kind=='sleep' and Config.SleepGain or Config.NapGain
    if kind~='sleep' and kind~='nap' then return end
    s.sleep=clamp(s.sleep+gain); TriggerClientEvent('vorp_sleep:state',src,s.sleep)
    TriggerEvent('vorp_psychology:recoverFromRest',src,kind)
end)
AddEventHandler('playerDropped', function() state[source]=nil; lastDrain[source]=nil end)
