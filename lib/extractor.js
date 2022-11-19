import * as constants from './constants.js';
import {parseCoordinates} from './utils/extractor_utils.js';

export class Extractor {
    constructor() {
    }

    gcodeStateReport(state) {
        // [GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]
        let gcodeData = state.replace("[", "").replace("]", "").replace("GC:", "").split(" ")

        let codes = []

        gcodeData.forEach(function (code) {
            if (/G.+/.test(code))
                codes.push(constants.gcodeMap.gcode[code])
            else if (/M.+/.test(code))
                codes.push(constants.gcodeMap.mcode[code])
            else if (/T.+/.test(code)) {
                codes.push({
                    code: "T",
                    name: "Tool",
                    description: "The current tool",
                    value: parseInt(code.replace("T", ""))
                })
            } else if (/F.+/.test(code)) {
                codes.push({
                    code: "F",
                    name: "Feed rate",
                    description: "The last feed command",
                    value: parseFloat(code.replace("F", ""))
                })
            } else if (/S.+/.test(code)) {
                codes.push({
                    code: "S",
                    name: "RPM",
                    description: "The current spindle speed command",
                    value: parseFloat(code.replace("S", ""))
                })
            } else
                codes.push({code: code, description: "Unknown gcode state", name: "Unknown"})
        })

        return {
            type: constants.messageTypes.gcodeState,
            data: {
                codes: codes
            },
            input: state
        }
    }

    grblInitReport(init) {
        // Grbl 1.1f ['$' for help]

        let initData = init.match(/^Grbl\sv?(\d\.\d.)\s\[\'\$\'\sfor\shelp\]$/)
        return {
            type: constants.messageTypes.initialize,
            data: {
                firmwareVersion: initData[1]
            },
            input: init
        }
    }

    errorReport(error) {
        // error:9
        // error:Bad number format
        let data = {}

        let errorData = error.split(":")
        let err = errorData[1]
        if (Number.isInteger(parseInt(errorData[1]))) {
            data.code = parseInt(err)
            data.message = constants.errorMap[err]
        } else
            data.message = error.replace("error:", "")

        return {
            type: constants.messageTypes.error,
            data: data,
            input: error
        }
    }

    alarmReport(alarm) {
        // ALARM:9
        // ALARM:Hard/soft limit

        let alarmData = alarm.split(":")[1]
        let data = {}

        if (Number.isInteger(parseInt(alarmData))) {
            data.code = parseInt(alarmData)
            data.message = constants.alarmMap[alarmData]
        } else
            data.message = alarmData

        return {
            type: constants.messageTypes.alarm,
            data: data,
            input: alarm
        }
    }

    buildVersionReport(version) {
        // [VER:1.1f.20170131:]

        let versionMatch = version.replace("[", "").replace("VER:", "").replace("]", "").split(":") //  '1.1f.20170131', 'My string!!'
        let versionData = versionMatch[0].match(/^(.+)\.(\d{8})$/)
        let data = {}
        data.firmwareVersion = versionData[1]
        data.buildDate = versionData[2]

        // data.firmwareVersion = versionData[0]
        if (versionMatch[1])
            data.buildString = versionMatch[1]

        return {
            type: constants.messageTypes.buildVersion,
            data: data,
            input: version
        }
    }

    buildOptionsReport(options) {
        // [OPT:V,15,128]

        let versionMatch = options.match(/\[(.+)\]/)
        let versionData = versionMatch[1].split(":")

        versionData = versionData[1]
        let versionOptions = versionData.split(",")
        let versionCodes = versionOptions[0].split("")
        let versionExtras = versionOptions.slice(1, versionOptions.length)

        let buildOptions = []
        let buildExtras = []

        versionCodes.forEach(function (code) {
            buildOptions.push({code: code, message: constants.buildOptionsMap[code]})
        })

        versionExtras.forEach(function (extra) {
            buildExtras.push(extra)
        })

        return {
            type: constants.messageTypes.buildOptions,
            data: {
                options: buildOptions,
                extras: buildExtras,
            },
            input: options
        }
    }

    settingsReport(setting) {
        // $10=255.5

        let settingData = setting.split("=")

        let data = {}
        data.code = parseFloat(settingData[0].match(/\$(\d+)/)[1])
        data.value = parseFloat(settingData[1])
        data.setting = constants.settingsMap[data.code].setting
        data.units = constants.settingsMap[data.code].units
        data.description = constants.settingsMap[data.code].description

        return {
            type: constants.messageTypes.setting,
            data: data,
            input: setting
        }
    }

    probeResultReport(probeResult) {
        // [PRB:0.000,0.000,1.492:1]
        let probeData = probeResult.replace("[PRB:", "").replace("]", "").split(":")
        // ["0.000, 0.000, 1.492", "1"]
        let data = {}

        data.location = parseCoordinates(probeData[0])
        data.success = parseInt(probeData[1]) === 1

        return {
            type: constants.messageTypes.probeResult,
            data: data,
            input: probeResult
        }
    }

    helpMessageReport(helpMessage) {
        // [HLP:$$ $# $G $I $N $x=val $Nx=line $J=line $SLP $C $X $H ~ ! ? ctrl-x]
        let helpData = helpMessage.replace("[HLP:", "").replace("]", "").split(" ")

        let data = {}
        data.availableCommands = []

        helpData.forEach(function (command) {
            data.availableCommands.push(command)
        })

        return {
            type: constants.messageTypes.helpMessage,
            data: data,
            input: helpMessage
        }
    }

    gcodeSystemReport(gcodeSystem) {
        // [G28:0.000,0.000,0.000]
        // [TLO:0.000]
        // [G28:0.000,-10.225,0.000]
        let data = {}
        let systemData = gcodeSystem.replace("[", "").replace("]", "").split(":")

        if (systemData[0] === "TLO") {
            data = constants.gcodeMap.tool[systemData[0]]
            data.coordinates = {z: parseFloat(systemData[1])}
        } else {
            data = constants.gcodeMap.gcode[systemData[0]]
            data.coordinates = parseCoordinates(systemData[1])
        }

        return {
            type: constants.messageTypes.gcodeSystem,
            data: data,
            input: gcodeSystem
        }
    }

    echoReport(echo) {
        // [echo:G1X0.540Y10.4F100]
        let data = {}
        let echoData = echo.replace("[", "").replace("]", "").split(":")
        data.message = echoData[1]

        return {
            type: constants.messageTypes.echoMessage,
            data: data,
            input: echo
        }
    }

    startupLineReport(startupLine) {
        // >G54G20:ok
        let data = {}
        let startupData = startupLine.replace(">", "").split(":")
        data.line = startupData[0]
        data.success = startupData[1] === "ok"

        return {
            type: constants.messageTypes.gcodeStartup,
            data: data,
            input: startupLine
        }
    }

    successReport(success) {
        // ok
        let data = {}
        data.success = success === "ok"

        return {
            type: constants.messageTypes.success,
            data: data,
            input: success
        }
    }

    feedbackMessageReport(feedbackMessage) {
        // [MSG:‘$H’|’$X’ to unlock]
        // [Caution: Unlocked]
        let data = {}
        let message = feedbackMessage.replace("[", "").replace("]", "")

        if (message.includes("MSG:")) {
            let messageData = message.split(":")
            data.message = messageData[1]
        } else
            data.message = message

        return {
            type: constants.messageTypes.feedbackMessage,
            data: data,
            input: feedbackMessage
        }
    }
}
