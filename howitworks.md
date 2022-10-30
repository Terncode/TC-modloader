
# Contexts 
The extension is using 4 different scripts

## Popup 
Popup handles all the mod installations and extension settings. It is running "vm" mod compiler to get mod info

## Background
Background script is holding installed mods, modifies requests for script to allow injection and blocks specific scripts

## Venom
A venom is injected script having full access to the webpage context with global variables and everything.

## Content
The content script runs in separate window we can't access global variables of the webpage itself. This script handles injection
of the venom script.

### Communications
Content script can easily send messages to background and the other way around however this is not possible with venom script as it is living inside the webpage context.
The content script will create a broadcasting channel using html body tag as messages emitter and receivers. messages between venom and content script are encrypted webpages should not be able to decipher what it is being sent between them
