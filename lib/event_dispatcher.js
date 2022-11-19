import {messageTypes} from './constants.js';

export class EventDispatcher {
    constructor() {
        this.listeners = []
    }

    dispatch(type, data) {
        this.listeners.forEach(function (listener) {
            if (listener.type === type) {
                listener.func(data)
            }
        })
    }

    addListener(type, func) {
        this.listeners.push({type: type, func: func})
    }

    removeListener(type, func) {
        let index = this.listeners.indexOf({type: type, func: func})
        this.listeners.forEach(function (listener, index) {
            if (listener.type === type && listener.func === func) {
                this.listeners.splice(index, 1)
            }
        }, this)
    }

    addToAllListeners(func) {
        for (let key in messageTypes) {
            this.addListener(key, func)
        }
    }
}
