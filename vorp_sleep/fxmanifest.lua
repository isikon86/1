fx_version 'cerulean'
game 'rdr3'
lua54 'yes'

author 'VORP Sleep'
description 'Sleep and rest system for RedM/VORP'
version '0.1.0'

dependency 'vorp_psychology'

shared_scripts { 'config.lua' }
client_scripts { 'client/main.lua' }
server_scripts { 'server/main.lua' }
