$SD.on('connected', (jsonObj) => connected(jsonObj));

var socket
globalSettings = {}

function connected(jsn) {

    let buttons = {}
    $SD.on('io.ccarbn.streamdeck.test.willAppear', (jsonObj) => {
        buttons[jsonObj.context] = new Test(jsonObj)
    });
    $SD.on('io.ccarbn.streamdeck.test.keyUp', (jsonObj) => buttons[jsonObj.context].onKeyUp(jsonObj));
    $SD.on('io.ccarbn.streamdeck.test.sendToPlugin', (jsonObj) => buttons[jsonObj.context].onSendToPlugin(jsonObj));
    $SD.on('io.ccarbn.streamdeck.test.ondidReceiveSettings', (jsonObj) => buttons[jsonObj.context].onDidReceiveSettings(jsonObj));
    $SD.on('io.ccarbn.streamdeck.test.ondidReceiveSettings', (jsonObj) => buttons[jsonObj.context].onDidReceiveSettings(jsonObj));
    $SD.on('io.ccarbn.streamdeck.test.propertyInspectorDidAppear', (jsonObj) => buttons[jsonObj.context].propertyInspectorDidAppear(jsonObj));

    $SD.on('didReceiveGlobalSettings', (jsn) => {
        globalSettings = Utils.getProp(jsn, 'payload.settings', {})

        if(globalSettings.userId) {
            let global = fetchAlerts(globalSettings.userId)
            if(global) {
                globalSettings = global
                $SD.api.setGlobalSettings(null, global)
            }
        }
    });

    $SD.api.getGlobalSettings($SD.uuid)
    $SD.api.getSettings($SD.uuid)   

    socket = io(`https://ccarbn.io/`, {
        path: '/api/socket.io',
        transports: ['websocket'],
    })
    socket.on('connect', () => {
        if(globalSettings.userId) {
            socket.emit('bind-streamdeck', {
                userId: globalSettings.userId
            })
        }
    })

    socket.on('accept-streamdeck', (data) => {
        console.log('accept-streamdeck', data)
    })

    socket.on('disconnect', (data) => {
        console.log('Socket disconnected')
    })

    
    socket.connect()
};


class Test {

    context
    settings = {}

    constructor(jsonObj) {
        this.context = jsonObj.context
        if(jsonObj.payload.settings)
            this.settings = jsonObj.payload.settings
    }

    onDidReceiveSettings(jsn) {
        this.settings = Utils.getProp(jsn, 'payload.settings', {});
    }
    onWillAppear(jsn) {
        this.settings = jsn.payload.settings;
    }

    onKeyUp(jsn) {
        if(globalSettings.userId)
            socket.emit('streamdeck-test', {
                userId: globalSettings.userId,
                alertId: this.settings.alert
            })
    }

    onSendToPlugin(jsn) {
        const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {});
        if(sdpi_collection.key==='refresh') {
            globalSettings = sdpi_collection.value
        } else if(sdpi_collection.key==='alert') {
            this.settings.alert = sdpi_collection.value
        } else if(sdpi_collection.key==='logout') {
            if(sdpi_collection.value === 'logout') {
                globalSettings = {}
                $SD.api.setGlobalSettings(null, globalSettings)
                $SD.api.sendToPropertyInspector(this.context, globalSettings)
            }
        } else if(sdpi_collection.key==='pairing') {
            let pairingKey = sdpi_collection.value
            socket.on('pair', (data) => {
                if(data.pairingKey === pairingKey) {
                    socket.emit('pair-successfull', data)
                    globalSettings = fetchAlerts(data.userId)
                    $SD.api.setGlobalSettings(null, globalSettings)
                    $SD.api.sendToPropertyInspector(this.context, globalSettings)
                }
            })
            socket.emit('pair-request', {
                pairingKey: pairingKey
            })
        }
    }
    propertyInspectorDidAppear(jsn) {
        if(globalSettings) {
            $SD.api.sendToPropertyInspector(this.context, globalSettings)
        }
    }
    saveSettings(jsn, sdpi_collection) {
        if (sdpi_collection.hasOwnProperty('key') && sdpi_collection.key != '') {
            if (sdpi_collection.value && sdpi_collection.value !== undefined) {
                this.settings[sdpi_collection.key] = sdpi_collection.value;
            }
        }
    }

};

