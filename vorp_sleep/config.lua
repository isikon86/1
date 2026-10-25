Config = {}
Config.SleepDuration = 30
Config.NapDuration = 20
Config.SleepGain = 100
Config.NapGain = 45
Config.SleepDrainInterval = 60
Config.SleepDrainAmount = 100 / (3 * 60)

-- INPUT_CONTEXT / E
Config.SitControl = 0xCEFD9220

-- How close the player must be to a supported seat before the prompt appears.
Config.InteractDistance = 1.65

-- How often (ms) we scan the nearby object pool while not sitting.
Config.ScanInterval = 350

-- If true, pressing E again while seated stands the player up.
Config.ToggleToStand = true

-- Player movement can naturally cancel many scenarios. This option also allows
-- INPUT_FRONTEND_CANCEL to stand if desired.
Config.AllowCancelToStand = true
Config.CancelControl = 0x156F7119

Config.PromptText = 'Сесть'
Config.PromptGroupText = 'Место для сидения'
Config.StandPromptText = 'Встать'
Config.LiePromptText = 'Лечь' -- удерживайте E
Config.BedPromptGroupText = 'Кровать'
Config.BedInteractDistance = 2.0

-- Default placement values. Most RDR2 chairs use these.
Config.SeatTypes = {
    chair = {
        scenario = 'GENERIC_SEAT_CHAIR_SCENARIO',
        x = 0.0,
        y = 0.0,
        z = 0.50,
        heading = 180.0
    },
    stool = {
        scenario = 'GENERIC_SEAT_CHAIR_SCENARIO',
        x = 0.0,
        y = 0.0,
        z = 0.72,
        heading = 180.0
    },
    bench = {
        scenario = 'GENERIC_SEAT_BENCH_SCENARIO',
        x = 0.0,
        y = -0.05,
        z = 0.50,
        heading = 180.0
    },
    couch = {
        scenario = 'GENERIC_SEAT_BENCH_SCENARIO',
        x = 0.0,
        y = -0.05,
        z = 0.50,
        heading = 180.0
    }
}

-- Model names confirmed in commonly-used RedM interaction lists.
-- Add/remove model names here without editing client.lua.
Config.Seats = {
    -- Chairs
    ['mp005_s_posse_col_chair01x'] = 'chair',
    ['mp005_s_posse_foldingchair_01x'] = 'chair',
    ['mp005_s_posse_trad_chair01x'] = 'chair',
    ['p_ambchair01x'] = 'chair',
    ['p_ambchair02x'] = 'chair',
    ['p_armchair01x'] = 'chair',
    ['p_bistrochair01x'] = 'chair',
    ['p_bench20x'] = 'chair',
    ['p_benchpiano02x'] = 'chair',
    ['p_chair02x'] = 'chair',
    ['p_chair04x'] = 'chair',
    ['p_chair05x'] = 'chair',
    ['p_chair06x'] = 'chair',
    ['p_chair07x'] = 'chair',
    ['p_chair09x'] = 'chair',
    ['p_chair_10x'] = 'chair',
    ['p_chair11x'] = 'chair',
    ['p_chair12bx'] = 'chair',
    ['p_chair12x'] = 'chair',
    ['p_chair13x'] = 'chair',
    ['p_chair14x'] = 'chair',
    ['p_chair15x'] = 'chair',
    ['p_chair16x'] = 'chair',
    ['p_chair17x'] = 'chair',
    ['p_chair18x'] = 'chair',
    ['p_chair19x'] = 'chair',
    ['p_chair20x'] = 'chair',
    ['p_chair21x'] = 'chair',
    ['p_chair21x_fussar'] = 'chair',
    ['p_chair22x'] = 'chair',
    ['p_chair23x'] = 'chair',
    ['p_chair24x'] = 'chair',
    ['p_chair25x'] = 'chair',
    ['p_chair26x'] = 'chair',
    ['p_chair27x'] = 'chair',
    ['p_chair30x'] = 'chair',
    ['p_chair31x'] = 'chair',
    ['p_chair37x'] = 'chair',
    ['p_chair38x'] = 'chair',
    ['p_chair_barrel04b'] = 'chair',
    ['p_chaircomfy01x'] = 'chair',
    ['p_chaircomfy02'] = 'chair',
    ['p_chaircomfy03x'] = 'chair',
    ['p_chaircomfy04x'] = 'chair',
    ['p_chaircomfy05x'] = 'chair',
    ['p_chaircomfy06x'] = 'chair',
    ['p_chaircomfy07x'] = 'chair',
    ['p_chaircomfy08x'] = 'chair',
    ['p_chaircomfy09x'] = 'chair',
    ['p_chaircomfy10x'] = 'chair',
    ['p_chaircomfy11x'] = 'chair',
    ['p_chaircomfy12x'] = 'chair',
    ['p_chaircomfy14x'] = 'chair',
    ['p_chaircomfy17x'] = 'chair',
    ['p_chaircomfy18x'] = 'chair',
    ['p_chaircomfy22x'] = 'chair',
    ['p_chaircomfy23x'] = 'chair',
    ['p_chairdoctor01x'] = 'chair',
    ['p_chair_crate02x'] = 'chair',
    ['p_chair_crate15x'] = 'chair',
    ['p_chair_cs05x'] = 'chair',
    ['p_chairdesk01x'] = 'chair',
    ['p_chairdesk02x'] = 'chair',
    ['p_chairdining01x'] = 'chair',
    ['p_chairdining02x'] = 'chair',
    ['p_chairdining03x'] = 'chair',
    ['p_chaireagle01x'] = 'chair',
    ['p_chairfolding02x'] = 'chair',
    ['p_chairhob01x'] = 'chair',
    ['p_chairhob02x'] = 'chair',
    ['p_chairmed01x'] = 'chair',
    ['p_chairmed02x'] = 'chair',
    ['p_chairoffice02x'] = 'chair',
    ['p_chairpokerfancy01x'] = 'chair',
    ['p_chairporch01x'] = 'chair',
    ['p_chair_privatedining01x'] = 'chair',
    ['p_chairrocking02x'] = 'chair',
    ['p_chairrocking03x'] = 'chair',
    ['p_chairrocking04x'] = 'chair',
    ['p_chairrocking05x'] = 'chair',
    ['p_chairrocking06x'] = 'chair',
    ['p_chairrustic01x'] = 'chair',
    ['p_chairrustic02x'] = 'chair',
    ['p_chairrustic03x'] = 'chair',
    ['p_chairrustic04x'] = 'chair',
    ['p_chairrustic05x'] = 'chair',
    ['p_chairrusticsav01x'] = 'chair',
    ['p_chairsalon01x'] = 'chair',
    ['p_chairvictorian01x'] = 'chair',
    ['p_chairwhite01x'] = 'chair',
    ['p_chairwicker01x'] = 'chair',
    ['p_chairwicker02x'] = 'chair',
    ['p_diningchairs01x'] = 'chair',
    ['p_gen_chair07x'] = 'chair',
    ['p_oldarmchair01x'] = 'chair',
    ['p_pianochair01x'] = 'chair',
    ['p_privatelounge_chair01x'] = 'chair',
    ['p_rockingchair01x'] = 'chair',
    ['p_rockingchair02x'] = 'chair',
    ['p_rockingchair03x'] = 'chair',
    ['p_seatbench01x'] = 'chair',
    ['p_settee02bx'] = 'chair',
    ['p_settee03x'] = 'chair',
    ['p_settee03bx'] = 'chair',
    ['p_sit_chairwicker01b'] = 'chair',
    ['p_theaterchair01b01x'] = 'chair',
    ['p_windsorchair01x'] = 'chair',
    ['p_windsorchair02x'] = 'chair',
    ['p_windsorchair03x'] = 'chair',
    ['p_woodbench02x'] = 'chair',
    ['p_woodendeskchair01x'] = 'chair',
    ['s_bench01x'] = 'chair',

    -- Stools / tall seats
    ['p_stool01x'] = 'stool',
    ['p_stool02x'] = 'stool',
    ['p_stool03x'] = 'stool',
    ['p_stool04x'] = 'stool',
    ['p_stool05x'] = 'stool',
    ['p_stool06x'] = 'stool',
    ['p_stool07x'] = 'stool',
    ['p_stool08x'] = 'stool',
    ['p_stool09x'] = 'stool',
    ['p_stool10x'] = 'stool',
    ['p_stool12x'] = 'stool',
    ['p_stool13x'] = 'stool',
    ['p_stool14x'] = 'stool',
    ['p_stoolcomfy01x'] = 'stool',
    ['p_stoolcomfy02x'] = 'stool',
    ['p_stoolfolding01bx'] = 'stool',
    ['p_stoolfolding01x'] = 'stool',
    ['p_stoolwinter01x'] = 'stool',
    ['o_stoolfoldingstatic01x'] = 'stool',
    ['p_barstool01x'] = 'stool',
    ['p_chairtall01x'] = 'stool',

    -- Benches
    ['p_bench03x'] = 'bench',
    ['p_bench06x'] = 'bench',
    ['p_bench08bx'] = 'bench',
    ['p_bench09x'] = 'bench',
    ['p_bench15_mjr'] = 'bench',
    ['p_bench15x'] = 'bench',
    ['p_bench18x'] = 'bench',
    ['p_benchch01x'] = 'bench',
    ['p_benchironnbx01x'] = 'bench',
    ['p_bench_log01x'] = 'bench',
    ['p_bench_log02x'] = 'bench',
    ['p_bench_log03x'] = 'bench',
    ['p_bench_log04x'] = 'bench',
    ['p_bench_log05x'] = 'bench',
    ['p_bench_log06x'] = 'bench',
    ['p_bench_log07x'] = 'bench',
    ['p_bench_logsnow07x'] = 'bench',
    ['p_benchnbx02x'] = 'bench',
    ['p_benchnbx03x'] = 'bench',
    ['p_windsorbench01x'] = 'bench',

    -- Sofas / couches / settees
    ['p_couch01x'] = 'couch',
    ['p_couch02x'] = 'couch',
    ['p_couch05x'] = 'couch',
    ['p_couch06x'] = 'couch',
    ['p_couch08x'] = 'couch',
    ['p_couch09x'] = 'couch',
    ['p_couch10x'] = 'couch',
    ['p_couch11x'] = 'couch',
    ['p_couchwicker01x'] = 'couch',
    ['p_hallbench01x'] = 'couch',
    ['p_loveseat01x'] = 'couch',
    ['p_settee01x'] = 'couch',
    ['p_settee04x'] = 'couch',
    ['p_settee_05x'] = 'couch',
    ['p_sit_chairwicker01a'] = 'couch',
    ['p_sofa02x'] = 'couch'
}


-- Bed placement profiles. These are based on known RDR2 bed interaction offsets.
-- A type can expose more than one slot, allowing either side of a larger bed.
Config.BedTypes = {
    bed = {
        scenario = 'PROP_HUMAN_SLEEP_BED_PILLOW',
        slots = {
            { x = 0.0, y = 0.0, z = 0.50, heading = 180.0 }
        }
    },
    bedSide = {
        scenario = 'PROP_HUMAN_SLEEP_BED_PILLOW',
        slots = {
            { x = -0.30, y = -0.20, z = 0.50, heading = 180.0 },
            { x =  0.30, y = -0.20, z = 0.50, heading = 180.0 }
        }
    },
    bedQuarterTurn = {
        scenario = 'PROP_HUMAN_SLEEP_BED_PILLOW',
        slots = {
            { x = 0.0, y = 0.0, z = 0.50, heading = 270.0 }
        }
    },
    bedForward = {
        scenario = 'PROP_HUMAN_SLEEP_BED_PILLOW',
        slots = {
            { x = 0.0, y = -0.50, z = 0.50, heading = 180.0 }
        }
    },
    bedHigh = {
        scenario = 'PROP_HUMAN_SLEEP_BED_PILLOW_HIGH',
        slots = {
            { x = 0.0, y = -0.30, z = 0.80, heading = 180.0 }
        }
    },
    bedHighSide = {
        scenario = 'PROP_HUMAN_SLEEP_BED_PILLOW_HIGH',
        slots = {
            { x = -0.30, y = -0.20, z = 0.80, heading = 180.0 },
            { x =  0.30, y = -0.20, z = 0.80, heading = 180.0 }
        }
    },
    king = {
        scenario = 'PROP_HUMAN_SLEEP_BED_PILLOW',
        slots = {
            { x = -0.50, y = 0.50, z = 0.50, heading = 180.0 },
            { x =  0.50, y = 0.50, z = 0.50, heading = 180.0 }
        }
    },
    bedroll = {
        scenario = 'WORLD_PLAYER_SLEEP_BEDROLL',
        slots = {
            { x = 0.0, y = 0.0, z = 0.0, heading = 180.0 }
        }
    },
    medical = {
        scenario = 'PROP_HUMAN_SLEEP_BED_PILLOW_HIGH',
        slots = {
            { x = 0.10, y = 0.0, z = 0.85, heading = 270.0 }
        }
    },
    sleptIn = {
        scenario = 'PROP_HUMAN_SLEEP_BED_PILLOW',
        slots = {
            { x = 0.30, y = -0.30, z = 0.50, heading = 270.0 },
            { x = 0.30, y =  0.30, z = 0.50, heading = 270.0 }
        }
    }
}

-- Supported RDR2 beds, cots, bedrolls and mattresses.
Config.Beds = {
    ['p_bed14x'] = 'bed',
    ['p_bed17x'] = 'bed',
    ['p_bed21x'] = 'bed',
    ['p_bedbunk03x'] = 'bed',
    ['p_bedindian02x'] = 'bed',
    ['p_cot01x'] = 'bed',

    ['p_bed20madex'] = 'bedSide',
    ['p_cs_pro_bed_unmade'] = 'bedSide',
    ['p_cs_bed20madex'] = 'bedSide',

    ['p_ambbed01x'] = 'bedQuarterTurn',
    ['p_bed03x'] = 'bedQuarterTurn',
    ['p_bed09x'] = 'bedQuarterTurn',
    ['p_bedindian01x'] = 'bedQuarterTurn',

    ['p_bed05x'] = 'bedForward',

    ['p_bed10x'] = 'bedHigh',
    ['p_bed12x'] = 'bedHigh',
    ['p_bed13x'] = 'bedHigh',
    ['p_bed22x'] = 'bedHigh',
    ['p_bed20x'] = 'bedHighSide',

    ['p_bedking02x'] = 'king',

    ['p_bedrollopen01x'] = 'bedroll',
    ['p_bedrollopen03x'] = 'bedroll',
    ['p_re_bedrollopen01x'] = 'bedroll',
    ['s_bedrollfurlined01x'] = 'bedroll',
    ['s_bedrollopen01x'] = 'bedroll',
    ['p_amb_mattress04x'] = 'bedroll',
    ['p_mattress04x'] = 'bedroll',
    ['p_mattress07x'] = 'bedroll',
    ['p_mattresscombined01x'] = 'bedroll',

    ['p_cs_ann_wrkr_bed01x'] = 'medical',
    ['p_cs_roc_hse_bed'] = 'medical',
    ['p_medbed01x'] = 'medical',

    ['p_cs_bedsleptinbed08x'] = 'sleptIn'
}



-- Bed props identified by numeric model hash. This lets us support world props
-- even when the original drawable/model name is not known yet.
Config.BedHashes = {
    -- Add confirmed numeric bed model hashes here.
    -- Do not add a hash from /sitdebug unless you have confirmed that object is the bed itself.
}

-- Fine-tune individual bed models here if one needs a custom scenario or slots.
-- Example:
-- ['p_bed14x'] = { scenario = 'PROP_HUMAN_SLEEP_BED_PILLOW', slots = { ... } }
Config.BedOverrides = {}

-- Fine-tune individual models here if one is slightly too high/low/forward/back.
-- Values override the type defaults above.
Config.ModelOverrides = {
    ['p_barstool01x'] = { z = 0.80 },
    ['p_chairtall01x'] = { z = 0.80 }
}

-- Debug helper. Keep false for normal use. /sitdebug toggles it at runtime.
Config.Debug = false
