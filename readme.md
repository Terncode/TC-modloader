<center>
    <img src="./assets/images/modloader.png"></img>
</center>

# TC's mod-loader
`TC's mod-loader` is a state-of-the-art web-browser-based mod loader capable of modifying website's running scripts, exposing webpage context to the running mods and giving ability to use browser background script which makes mods really powerful. 
<center>
    <img src="./assets/images/modloaderpopup.png"></img>
    <img src="./assets/images/webpage-gui.png"></img>
</center>

# Compatibility
The modloader currently supports firefox and chrome
### Behaviour
The modloader works better on firefox because it natively support request modifying where in chrome it has to manually inject script in to page to make it work.
Chrome manifest v3 is currently not supported 

## Safety?
With great power comes great responsibility. You should never trust mods that you find online. The mod-loader does only comes with basic protection against malicious code.

## build
```
npm install
npm run dev #dev build
npm run build
```

## Make mods
```
cd mod-builder
npm install
npm run build
```
