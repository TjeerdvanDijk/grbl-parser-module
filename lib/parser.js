// https://github.com/Crazyglue/grbl-parser

import  * as constants from './constants.js';
import {Checker} from './checker.js';
import {EventDispatcher} from './event_dispatcher.js';
import {StatusExtractor} from './status_extractor.js';
import {Extractor} from './extractor.js';


export class GrblParser {
    constructor() {
        this.check = new Checker()
        this.messageTypes = constants.messageTypes
        this.statusExtractor = new StatusExtractor()
        this.extractor = new Extractor()
        this.dispatcher = new EventDispatcher()
    }


    parseData(string) {
        let data = string.trim()
        if (this.check.isStatusReport(data)) {
            let statusData = this.statusExtractor.statusReport(data)
            this.dispatcher.dispatch(this.messageTypes.status, statusData)
        } else if (this.check.isSuccessResponse(data)) {
            let successData = this.extractor.successReport(data)
            this.dispatcher.dispatch(this.messageTypes.success, successData)
        } else if (this.check.isGrblInitialization(data)) {
            let initData = this.extractor.grblInitReport(data)
            this.dispatcher.dispatch(this.messageTypes.initialize, initData)
        } else if (this.check.isAlarm(data)) {
            let alarmData = this.extractor.alarmReport(data)
            this.dispatcher.dispatch(this.messageTypes.alarm, alarmData)
        } else if (this.check.isError(data)) {
            let errorData = this.extractor.errorReport(data)
            this.dispatcher.dispatch(this.messageTypes.error, errorData)
        } else if (this.check.isGrblSetting(data)) {
            let grblSettingData = this.extractor.settingsReport(data)
            this.dispatcher.dispatch(this.messageTypes.setting, grblSettingData)
        } else if (this.check.isFeedbackMessage(data)) {
            let feedbackMessageData = this.extractor.feedbackMessageReport(data)
            this.dispatcher.dispatch(this.messageTypes.feedbackMessage, feedbackMessageData)
        } else if (this.check.isBuildVersion(data)) {
            let buildVersionData = this.extractor.buildVersionReport(data)
            this.dispatcher.dispatch(this.messageTypes.buildVersion, buildVersionData)
        } else if (this.check.isBuildOptions(data)) {
            let buildOptionsData = this.extractor.buildOptionsReport(data)
            this.dispatcher.dispatch(this.messageTypes.buildOptions, buildOptionsData)
        } else if (this.check.isGcodeState(data)) {
            let gcodeStateData = this.extractor.gcodeStateReport(data)
            this.dispatcher.dispatch(this.messageTypes.gcodeState, gcodeStateData)
        } else if (this.check.isHelpMessage(data)) {
            let helpData = this.extractor.helpMessageReport(data)
            this.dispatcher.dispatch(this.messageTypes.helpMessage, helpData)
        } else if (this.check.isGcodeSystem(data)) {
            let gcodeSystem = this.extractor.gcodeSystemReport(data)
            this.dispatcher.dispatch(this.messageTypes.gcodeSystem, gcodeSystem)
        } else if (this.check.isProbeResult(data)) {
            let probeResultData = this.extractor.probeResultReport(data)
            this.dispatcher.dispatch(this.messageTypes.probeResult, probeResultData)
        } else if (this.check.isEcho(data)) {
            let echoReport = this.extractor.echoReport(data)
            this.dispatcher.dispatch(this.messageTypes.echoMessage, echoReport)
        } else if (this.check.isStartupLine(data)) {
            let startupLineData = this.extractor.startupLineReport(data)
            this.dispatcher.dispatch(this.messageTypes.gcodeStartup, startupLineData)
        } else {
            let unknownData = {input: data, type: this.messageTypes.unknown}
            this.dispatcher.dispatch(this.messageTypes.unknown, unknownData)
        }
    }
}
