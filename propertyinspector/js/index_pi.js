var onchangeevt = 'onchange'; // 'oninput';
let sdpiWrapper = document.querySelector('.sdpi-wrapper');
let settings;

globalSettings = {}

$SD.on('connected', (jsn) => {
    addDynamicStyles($SD.applicationInfo.colors, 'connectSocket');
    settings = Utils.getProp(jsn, 'actionInfo.payload.settings', false);
    if (settings) {
        updateUI(settings);
    }

    $SD.on('didReceiveGlobalSettings', (jsonObj) => {
        globalSettings = Object.assign(globalSettings, jsonObj.payload.settings)
        if(globalSettings.userId) {
            fillSelect(globalSettings)
        } else {
            preparePairing()
        }
        
    });
    $SD.api.getGlobalSettings() 
});

 
$SD.on('sendToPropertyInspector', jsn => {
    if(jsn.action === "io.ccarbn.streamdeck.test") {
        if(jsn.payload.userId && jsn.payload.alerts) {
            globalSettings = jsn.payload
            fillSelect(globalSettings)
            return
        } else {
            globalSettings = {}
            preparePairing()
        }
    }


    const pl = jsn.payload;
    /**
     *  This is an example, how you could show an error to the user
     */
     if (pl.hasOwnProperty('error')) {
        sdpiWrapper.innerHTML = `<div class="sdpi-item">
            <details class="message caution">
            <summary class="${pl.hasOwnProperty('info') ? 'pointer' : ''}">${pl.error}</summary>
                ${pl.hasOwnProperty('info') ? pl.info : ''}
            </details>
        </div>`;
    } else {

        /**
         *
         * Do something with the data sent from the plugin
         * e.g. update some elements in the Property Inspector's UI.
         *
         */
    }
});

const updateUI = (pl) => {
    Object.keys(pl).map(e => {
        if (e && e != '') {
            const foundElement = document.querySelector(`#${e}`);
            //console.log(`searching for: #${e}`, 'found:', foundElement);
            if (foundElement && foundElement.type !== 'file') {
                foundElement.value = pl[e];
                const maxl = foundElement.getAttribute('maxlength') || 50;
                const labels = document.querySelectorAll(`[for='${foundElement.id}']`);
                if (labels.length) {
                    for (let x of labels) {
                        x.textContent = maxl ? `${foundElement.value.length}/${maxl}` : `${foundElement.value.length}`;
                    }
                }
            }
        }
   })

   
}




var button = document.getElementById("refresh");
var logoutButton = document.getElementById("logout");
/* setTimeout(() => {
    button.removeAttribute("disabled");
}, 5000); */

var select = document.getElementById("alert");
const fillSelect = (globalSettings) => {
    var pair = document.getElementById('pairing-container')
    if(pair) {
        pair.classList.add('hidden')
    }
    var refresh = document.getElementById('refresh-container')
    if(refresh) {
        refresh.classList.remove('hidden')
    }
    var alert = document.getElementById('alert-container')
    if(alert) {
        alert.classList.remove('hidden')
    }
    var logout = document.getElementById('logout-container')
    if(logout) {
        logout.classList.remove('hidden')
    }
    
    select.options.length = 0
    if(!globalSettings.alerts || globalSettings.alerts.length<1) {
        var option = document.createElement("option");
        option.innerHTML = 'Waiting for connection...'
        option.value = '0'
        select.options.add(option)
    } else if(globalSettings.alerts && globalSettings.alerts.length>0) {
        var option = document.createElement("option");
        option.innerHTML = ''
        option.value = 'None'
        select.options.add(option)
        for(let alert of globalSettings.alerts) {
            var option = document.createElement("option");
            option.innerHTML = alert.name
            option.value = alert._id
            if(option.value === settings.alert)
                option.selected = true
            select.options.add(option)
        }
    }
}

const preparePairing = () => {
    var pair = document.getElementById('pairing-container')
    if(pair) {
        pair.classList.remove('hidden')
    }
    var refresh = document.getElementById('refresh-container')
    if(refresh) {
        refresh.classList.add('hidden')
    }
    var alert = document.getElementById('alert-container')
    if(alert) {
        alert.classList.add('hidden')
    }
    var logout = document.getElementById('logout-container')
    if(logout) {
        logout.classList.add('hidden')
    }


}

$SD.on('piDataChanged', (returnValue) => {    
    if (returnValue.key === 'refresh') {
        button.removeAttribute('disabled')
        logoutButton.removeAttribute('disabled')
        if(globalSettings.userId) {
            globalSettings = fetchAlerts(globalSettings.userId)
            sendValueToPlugin(globalSettings, 'sdpi_collection');
            button.setAttribute('disabled', true)
            setTimeout(() => {
                button.removeAttribute("disabled");
            }, 5000);
        }
    } else if(returnValue.key === 'pairing') {
        let pairingKey = uuidv4()
        $SD.api.openUrl($SD.uuid, `http://ccarbn.io/auth/pairing/${pairingKey}`)
        returnValue.value = pairingKey
        sendValueToPlugin(returnValue, 'sdpi_collection')
    } else if(returnValue.key ==='alert' && returnValue.value && typeof returnValue.value === 'string') {
        saveSettings(returnValue);
        sendValueToPlugin(returnValue, 'sdpi_collection');
    } else if(returnValue.key ==='logout') {
        returnValue.value = 'logout'
        sendValueToPlugin(returnValue, 'sdpi_collection');
        logoutButton.setAttribute('disabled', true)
        button.setAttribute('disabled', true)
    } 
});





 function saveSettings(sdpi_collection) {
    if (typeof sdpi_collection !== 'object') return;

    if (sdpi_collection.hasOwnProperty('key') && sdpi_collection.key != '') {
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            settings[sdpi_collection.key] = sdpi_collection.value;
            $SD.api.setSettings($SD.uuid, settings);
        }
    }
 }

 function sendValueToPlugin(value, prop) {
    if ($SD.connection && $SD.connection.readyState === 1) {
        const json = {
            action: $SD.actionInfo['action'],
            event: 'sendToPlugin',
            context: $SD.uuid,
            payload: {
                [prop]: value,
                targetContext: $SD.actionInfo['context']
            }
        };

        $SD.connection.send(JSON.stringify(json));
        if(prop.key ==='refresh') {
            button.setAttribute("disabled", true)
            setTimeout(() => {
                button.removeAttribute("disabled");
            }, 5000);
        }
    }
}




/** CREATE INTERACTIVE HTML-DOM
 * The 'prepareDOMElements' helper is called, to install events on all kinds of
 * elements (as seen e.g. in PISamples)
 * Elements can get clicked or act on their 'change' or 'input' event. (see at the top
 * of this file)
 * Messages are then processed using the 'handleSdpiItemChange' method below.
 * If you use common elements, you don't need to touch these helpers. Just take care
 * setting an 'id' on the element's input-control from which you want to get value(s).
 * These helpers allow you to quickly start experimenting and exchanging values with
 * your plugin.
 */

function prepareDOMElements(baseElement) {
    baseElement = baseElement || document;
    Array.from(baseElement.querySelectorAll('.sdpi-item-value')).forEach(
        (el, i) => {
            const elementsToClick = [
                'BUTTON',
                'OL',
                'UL',
                'TABLE',
                'METER',
                'PROGRESS',
                'CANVAS'
            ].includes(el.tagName);
            const evt = elementsToClick ? 'onclick' : onchangeevt || 'onchange';

            /** Look for <input><span> combinations, where we consider the span as label for the input
             * we don't use `labels` for that, because a range could have 2 labels.
             */
            const inputGroup = el.querySelectorAll('input + span');
            if (inputGroup.length === 2) {
                const offs = inputGroup[0].tagName === 'INPUT' ? 1 : 0;
                inputGroup[offs].textContent = inputGroup[1 - offs].value;
                inputGroup[1 - offs]['oninput'] = function() {
                    inputGroup[offs].textContent = inputGroup[1 - offs].value;
                };
            }
            /** We look for elements which have an 'clickable' attribute
             * we use these e.g. on an 'inputGroup' (<span><input type="range"><span>) to adjust the value of
             * the corresponding range-control
             */
            Array.from(el.querySelectorAll('.clickable')).forEach(
                (subel, subi) => {
                    subel['onclick'] = function(e) {
                        handleSdpiItemChange(e.target, subi);
                    };
                }
            );
            /** Just in case the found HTML element already has an input or change - event attached,
             * we clone it, and call it in the callback, right before the freshly attached event
            */
            const cloneEvt = el[evt];
            el[evt] = function(e) {
                if (cloneEvt) cloneEvt();
                handleSdpiItemChange(e.target, i);
            };
        }
    );

    /**
     * You could add a 'label' to a textares, e.g. to show the number of charactes already typed
     * or contained in the textarea. This helper updates this label for you.
     */
    baseElement.querySelectorAll('textarea').forEach((e) => {
        const maxl = e.getAttribute('maxlength');
        e.targets = baseElement.querySelectorAll(`[for='${e.id}']`);
        if (e.targets.length) {
            let fn = () => {
                for (let x of e.targets) {
                    x.textContent = maxl ? `${e.value.length}/${maxl}` : `${e.value.length}`;
                }
            };
            fn();
            e.onkeyup = fn;
        }
    });

    baseElement.querySelectorAll('[data-open-url').forEach(e => {
        const value = e.getAttribute('data-open-url');
        if (value) {
            e.onclick = () => {
                let path;
                if (value.indexOf('http') !== 0) {
                    path = document.location.href.split('/');
                    path.pop();
                    path.push(value.split('/').pop());
                    path = path.join('/');
                } else {
                    path = value;
                }
                $SD.api.openUrl($SD.uuid, path);
            };
        } else {
            console.log(`${value} is not a supported url`);
        }
    });
}

function handleSdpiItemChange(e, idx) {

    /** Following items are containers, so we won't handle clicks on them */

    if (['OL', 'UL', 'TABLE'].includes(e.tagName)) {
        return;
    }

    /** SPANS are used inside a control as 'labels'
     * If a SPAN element calls this function, it has a class of 'clickable' set and is thereby handled as
     * clickable label.
     */

    if (e.tagName === 'SPAN') {
        const inp = e.parentNode.querySelector('input');
        var tmpValue;

        // if there's no attribute set for the span, try to see, if there's a value in the textContent
        // and use it as value
        if (!e.hasAttribute('value')) {
               tmpValue = Number(e.textContent);
            if (typeof tmpValue === 'number' && tmpValue !== null) {
                e.setAttribute('value', 0+tmpValue); // this is ugly, but setting a value of 0 on a span doesn't do anything
                e.value = tmpValue;
            }
        } else {
            tmpValue = Number(e.getAttribute('value'));
        }

        if (inp && tmpValue !== undefined) {
            inp.value = tmpValue;
        } else return;
    }

    const selectedElements = [];
    const isList = ['LI', 'OL', 'UL', 'DL', 'TD'].includes(e.tagName);
    const sdpiItem = e.closest('.sdpi-item');
    const sdpiItemGroup = e.closest('.sdpi-item-group');
    let sdpiItemChildren = isList
        ? sdpiItem.querySelectorAll(e.tagName === 'LI' ? 'li' : 'td')
        : sdpiItem.querySelectorAll('.sdpi-item-child > input');

    if (isList) {
        const siv = e.closest('.sdpi-item-value');
        if (!siv.classList.contains('multi-select')) {
            for (let x of sdpiItemChildren) x.classList.remove('selected');
        }
        if (!siv.classList.contains('no-select')) {
            e.classList.toggle('selected');
        }
    }

    if (sdpiItemChildren.length && ['radio','checkbox'].includes(sdpiItemChildren[0].type)) {
        e.setAttribute('_value', e.checked); //'_value' has priority over .value
    }
    if (sdpiItemGroup && !sdpiItemChildren.length) {
        for (let x of ['input', 'meter', 'progress']) {
            sdpiItemChildren = sdpiItemGroup.querySelectorAll(x);
            if (sdpiItemChildren.length) break;
        }
    }

    if (e.selectedIndex !== undefined) {
        if (e.tagName === 'SELECT') {
            sdpiItemChildren.forEach((ec, i) => {
                selectedElements.push({ [ec.id]: ec.value });
            });
        }
        idx = e.selectedIndex;
    } else {
        sdpiItemChildren.forEach((ec, i) => {
            if (ec.classList.contains('selected')) {
                selectedElements.push(ec.textContent);
            }
            if (ec === e) {
                idx = i;
                selectedElements.push(ec.value);
            }
        });
    }

    const returnValue = {
        key: e.id && e.id.charAt(0) !== '_' ? e.id : sdpiItem.id,
        value: isList
            ? e.textContent
            : e.hasAttribute('_value')
            ? e.getAttribute('_value')
            : e.value
            ? e.type === 'file'
                ? decodeURIComponent(e.value.replace(/^C:\\fakepath\\/, ''))
                : e.value
            : e.getAttribute('value'),
        group: sdpiItemGroup ? sdpiItemGroup.id : false,
        index: idx,
        selection: selectedElements,
        checked: e.checked
    };

    /** Just simulate the original file-selector:
     * If there's an element of class '.sdpi-file-info'
     * show the filename there
     */
    if (e.type === 'file') {
        const info = sdpiItem.querySelector('.sdpi-file-info');
        if (info) {
            const s = returnValue.value.split('/').pop();
            info.textContent =                s.length > 28
                    ? s.substr(0, 10)
                      + '...'
                      + s.substr(s.length - 10, s.length)
                    : s;
        }
    }

    $SD.emit('piDataChanged', returnValue);
}

/**
 * This is a quick and simple way to localize elements and labels in the Property
 * Inspector's UI without touching their values.
 * It uses a quick 'lox()' function, which reads the strings from a global
 * variable 'localizedStrings' (in 'common.js')
 */

// eslint-disable-next-line no-unused-vars
function localizeUI() {
    const el = document.querySelector('.sdpi-wrapper') || document;
    let t;
    Array.from(el.querySelectorAll('sdpi-item-label')).forEach(e => {
        t = e.textContent.lox();
        if (e !== t) {
            e.innerHTML = e.innerHTML.replace(e.textContent, t);
        }
    });
    Array.from(el.querySelectorAll('*:not(script)')).forEach(e => {
        if (
            e.childNodes
            && e.childNodes.length > 0
            && e.childNodes[0].nodeValue
            && typeof e.childNodes[0].nodeValue === 'string'
        ) {
            t = e.childNodes[0].nodeValue.lox();
            if (e.childNodes[0].nodeValue !== t) {
                e.childNodes[0].nodeValue = t;
            }
        }
    });
}

/**
 *
 * Some more (de-) initialization helpers
 *
 */

document.addEventListener('DOMContentLoaded', function() {
    document.body.classList.add(navigator.userAgent.includes("Mac") ? 'mac' : 'win');
    prepareDOMElements();
    $SD.on('localizationLoaded', (language) => {
        localizeUI();
    });
});

/** the beforeunload event is fired, right before the PI will remove all nodes */
window.addEventListener('beforeunload', function(e) {
    e.preventDefault();
    sendValueToPlugin('propertyInspectorWillDisappear', 'property_inspector');
    // Don't set a returnValue to the event, otherwise Chromium with throw an error.  // e.returnValue = '';
});

function gotCallbackFromWindow(parameter) {
    console.log(parameter);
}

