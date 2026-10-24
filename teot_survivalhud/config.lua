Config = {}

-- HUD position: compact row at the bottom center.
Config.UpdateInterval = 250
Config.VoiceUpdateInterval = 100
Config.NeedsMaxValue = 1000

-- Hide the native radar/minimap.
Config.HideRadar = true

-- Hide the built-in VORP Metabolism hunger/thirst NUI, without disabling
-- the actual hunger/thirst mechanics.
Config.HideVorpMetabolismHud = true

-- Hide our HUD while the pause menu is open.
Config.HideInPauseMenu = true

Config.Debug = false

-- Player can toggle this HUD with /hud or F7.
Config.ToggleCommand = 'hud'
Config.ToggleKey = 'NUMPAD0'


-- Ambient temperature indicators for TEOT Survival HUD (degrees Celsius).
-- These values only control the HUD warning levels; they do not alter player stats.
Config.TemperatureEnabled = true
Config.TemperatureUpdateInterval = 1000
Config.ColdStartC = 8.0
Config.ColdCriticalC = -5.0
Config.HeatStartC = 28.0
Config.HeatCriticalC = 40.0
