import {statusMap, subStateMessage, messageTypes} from './constants.js';
import {parseCoordinates} from './utils/extractor_utils.js';

export class StatusExtractor {
    constructor() {
    }


    statusReport(message) {
        let report = {}
        // <Hold:0|MPos:0.000,0.000,0.000|Bf:15,128|FS:675.5,24000|Ov:120,100,100|WCO:0.000,-5.200,306.351|A:SFM>
        // <Idle,MPos:0.000,0.000,0.000,WPos:0.000,0.000,0.000>
        let match = message.match(/^<(.*)>$/)[1]
        // Hold:0|MPos:0.000,0.000,0.000|Bf:15,128|FS:0,0|WCO:0.000,0.000,306.351
        // Idle,MPos:0.000,0.000,0.000,WPos:0.000,0.000,0.000

        if (message.includes(",MPos:") || message.includes(",WPos:")) {
            let statusData = match.match(/(\w+)\,(.+)/)
            report.status = this.parseStatus(statusData[1]) // Idle
            let statusParams = statusData[2].match(/([a-zA-Z]+)\:([\d\,\.\-\|]+)\,?/g) // [ "MPos:0.000,0.000,0.000,", "WPos:0.000,0.000,0.000,", "Buf:0,", "RX:0,", "Lim:000" ]

            let paramMap = {}
            let buffer = []

            statusParams.forEach(function (param) {
                let paramData = param.split(":")   // [ "MPos", "0.000,0.000,0.000," ]
                let key = paramData[0]
                let value = paramData[1]

                if (key === "Buf")
                    buffer[0] = value.replace(",", "")
                else if (key === "RX")
                    buffer[1] = value.replace(",", "")
                else
                    report[statusMap[key]] = value

            })

            if (buffer.length > 0)
                report.buffer = buffer.join(",")
        } else {
            let params = match.split("|")
            // ["Hold:0", "MPos:0.000,0.000,0.000", "Bf:15,128", ...]

            report.status = this.parseStatus(params[0]) // "Hold:0"

            let paramsPairs = params.slice(1, params.length)

            paramsPairs.forEach(function (param) {
                let paramData = param.split(":")
                report[statusMap[paramData[0]]] = paramData[1]
            })
        }

        if (report.machinePosition) {
            report.machinePosition = parseCoordinates(report.machinePosition)
        }

        if (report.workPosition) {
            report.workPosition = parseCoordinates(report.workPosition)
        }

        if (report.workcoordinateOffset) {
            report.workcoordinateOffset = parseCoordinates(report.workcoordinateOffset)
        }

        if (report.accessories) {
            report.accessories = this.parseAccessories(report.accessories)
        }

        if (report.buffer) {
            report.buffer = this.parseBuffer(report.buffer)
        }

        if (report.realtimeFeed) {
            report.realtimeFeed = this.parseFeeds(report.realtimeFeed)
        }

        if (report.override) {
            report.override = this.parseOverride(report.override)
        }

        if (report.pins) {
            report.pins = this.parsePins(report.pins)
        }

        return {
            data: report,
            type: messageTypes.status,
            input: message
        }
    }

    parsePins(pins) {
        let data = []
        let limitPinMap = {
            0: "limit-x",
            1: "limit-y",
            2: "limit-z"
        }
        let controlPinMap = {
            0: "door",
            1: "hold",
            2: "soft-reset",
            3: "cycle-start",
        }

        if (/([01]+)\,?([01])?\,?([01]+)?/.test(pins)) {
            // 000,1,0000
            let pinMatch = pins.match(/(\d{3})?(\|\d\|)?(\d+)?/)
            let xyzPins = pinMatch[1]
            let probePin = pinMatch[2]
            let controlPins = pinMatch[3]

            if (xyzPins) {
                let limitPins = xyzPins.split("")
                limitPins.forEach(function (value, index) {
                    let pin = {pin: limitPinMap[index], on: (value === "1")}
                    data.push(pin)
                })
            }

            if (probePin) {
                data.push({pin: "probe", on: probePin.replace(/\|/g, "") === "1"})
            }

            if (controlPins) {
                controlPins.split("").forEach(function (pin, index) {
                    data.push({pin: controlPinMap[index], on: pin === "1"})
                })
            }
        } else {
            let grbl11pinMap = {
                "X": "limit-x",
                "Y": "limit-y",
                "Z": "limit-z",
                "P": "probe",
                "D": "door",
                "H": "hold",
                "R": "soft-reset",
                "S": "cycle-start",
            }
            let pinData = pins.split("")

            pinData.forEach(function (pin) {
                let pin2 = {pin: grbl11pinMap[pin], on: true}
                data.push(pin2)
            })

        }
        return data
    }

    parseStatus(status) {
        // Hold:0
        let match = status.split(":")

        let parsedStatus = {
            state: match[0]
        }

        if (match[1]) {
            parsedStatus.code = parseFloat(match[1])
            parsedStatus.message = subStateMessage[match[0]][match[1]]
        }

        return parsedStatus
    }

    parseAccessories(accessories) {
        // SFM
        let flags = accessories.split("")
        let parsedAccessories = {}

        if (flags.indexOf("F") > -1)
            parsedAccessories.flood = true
        else
            parsedAccessories.flood = false

        if (flags.indexOf("M") > -1)
            parsedAccessories.mist = true
        else
            parsedAccessories.mist = false

        if (flags.indexOf("S") > -1)
            parsedAccessories.spindleDirection = "clockwise"
        else
            parsedAccessories.spindleDirection = "counter-clockwise"

        return parsedAccessories
    }

    parseBuffer(buffer) {
        // example input: "15,128"
        let bufferData = buffer.split(",")
        let parsedBuffer = {
            availableBlocks: parseFloat(bufferData[0]),
            availableRXBytes: parseFloat(bufferData[1])
        }

        return parsedBuffer
    }

    parseFeeds(feeds) {
        // example input: "15.432,12000.5"
        let feedData = feeds.split(",")
        let parsedFeeds = {}

        parsedFeeds.realtimeFeedrate = parseFloat(feedData[0])
        parsedFeeds.realtimeSpindle = parseFloat(feedData[1])

        return parsedFeeds
    }

    parseOverride(override) {
        // 120,100,100
        let overrideData = override.split(",")

        return {
            feeds: parseFloat(overrideData[0]),
            rapids: parseFloat(overrideData[1]),
            spindle: parseFloat(overrideData[2])
        }
    }
}
