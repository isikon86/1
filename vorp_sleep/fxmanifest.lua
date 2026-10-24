fx_version 'cerulean'
games { 'rdr3' }
game 'rdr3'
rdr3_warning 'I acknowledge that this is a pre-release build of RedM, and I am aware my resources will be incompatible once RedM ships.'
lua54 'yes'

author 'VORP Sleep'
description 'Sleep and rest system for RedM/VORP'
version '0.1.0'

dependency 'vorp_psychology'

shared_scripts { 'config.lua' }
client_scripts { 'client/main.lua' }
server_scripts { 'server/main.lua' }
