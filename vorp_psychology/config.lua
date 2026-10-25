Config = {}
Config.TickSeconds = 10
Config.StressPerTick = { shooting = 2, zombie = 3, day = 0.05, night = 0.5, bloodMoon = 2 }
Config.KillPsychologyLoss = { zombie = 2, player = 10 }
Config.NightStart, Config.NightEnd = 21, 6
Config.BloodMoon = false
Config.CoffeePsychologyGain, Config.CigarettePsychologyGain = 10, 8
Config.CoffeeSleepGain, Config.CoffeePsychologyLoss = 15, 3
Config.AlcoholPsychologyGain, Config.AlcoholSleepLoss = 15, 10
Config.SleepPsychologyGain, Config.NapPsychologyGain = 45, 20
Config.CigaretteCooldown, Config.CoffeeCooldown = 600, 300
Config.CigaretteItem, Config.CoffeeItem = 'cigarette', 'coffee'
Config.ZombieStressDistance = 35.0
Config.LightProtectionRadius = 1.0
Config.LightStressMultiplier = 0.5
Config.LightModels = {
    'p_campfire01x', 'p_campfire02x', 'p_campfire03x', 'p_campfire04x',
    'p_campfirecombined01x', 'p_campfirecombined02x', 'p_campfirecombined03x',
    'p_lantern01x', 'p_lantern02x', 'p_lantern03x', 'p_lantern04x',
    'p_lamp01x', 'p_lamp02x', 'p_lamp03x'
}
Config.StaminaDrainBelow = 50
Config.StaminaDrainPerSecond = 0.01
