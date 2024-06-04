import { InstanceBase, runEntrypoint, InstanceStatus, combineRgb } from '@companion-module/base'
import got from 'got'
import { configFields } from './config.js'
import { upgradeScripts } from './upgrade.js'

class WatsonCaptioningInstance extends InstanceBase {
  configUpdated(config) {
    this.config = config

    this.initActions()
    this.initVariables()
    this.initFeedbacks()
    this.initPolling()
  }

  init(config) {
    this.config = config

    this.updateStatus(InstanceStatus.Ok)

    this.initActions()
    this.initVariables()
    this.initFeedbacks()
    this.initPolling()
  }

  // Return config fields for web config
  getConfigFields() {
    return configFields
  }

  // When module gets deleted
  async destroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
    }
  }

  initActions() {
    this.setActionDefinitions({
      start_captioning: {
        name: 'Start Captioning',
        options: [],
        callback: async (action, context) => {
          const url = `${this.config.url}/begin_transcript`
          try {
            await got.get(url, { https: { rejectUnauthorized: this.config.rejectUnauthorized } })
            this.updateStatus(InstanceStatus.Ok)
          } catch (e) {
            this.log('error', `HTTP GET Request failed (${e.message})`)
            this.updateStatus(InstanceStatus.UnknownError, e.code)
          }
        },
      },
      end_captioning: {
        name: 'End Captioning',
        options: [],
        callback: async (action, context) => {
          const url = `${this.config.url}/session_close`
          try {
            await got.get(url, { https: { rejectUnauthorized: this.config.rejectUnauthorized } })
            this.updateStatus(InstanceStatus.Ok)
          } catch (e) {
            this.log('error', `HTTP GET Request failed (${e.message})`)
            this.updateStatus(InstanceStatus.UnknownError, e.code)
          }
        },
      },
      fetch_status: {
        name: 'Fetch Status',
        options: [],
        callback: async (action, context) => {
          this.fetchStatus()
        },
      },
      disable_captions: {
        name: 'Mute Captions',
        options: [],
        callback: async (action, context) => {
          const url = `${this.config.url}/disable_captions`
          try {
            await got.get(url, { https: { rejectUnauthorized: this.config.rejectUnauthorized } })
            this.updateStatus(InstanceStatus.Ok)
          } catch (e) {
            this.log('error', `HTTP GET Request failed (${e.message})`)
            this.updateStatus(InstanceStatus.UnknownError, e.code)
          }
        },
      },
      enable_captions: {
        name: 'Unmute Captions',
        options: [],
        callback: async (action, context) => {
          const url = `${this.config.url}/enable_captions`
          try {
            await got.get(url, { https: { rejectUnauthorized: this.config.rejectUnauthorized } })
            this.updateStatus(InstanceStatus.Ok)
          } catch (e) {
            this.log('error', `HTTP GET Request failed (${e.message})`)
            this.updateStatus(InstanceStatus.UnknownError, e.code)
          }
        },
      },
    })
  }

  initVariables() {
    const instanceName = this.config.label || 'watson_instance'

    // Define initial variables (optional)
    const variableDefinitions = [
      { variableId: `${instanceName}_session_status`, name: 'Session Status' },
      { variableId: `${instanceName}_hold_status`, name: 'Hold Status' },
      { variableId: `${instanceName}_audioValues`, name: 'Audio Values' },
      { variableId: `${instanceName}_isOutputMuted`, name: 'Is Output Muted' },
      { variableId: `${instanceName}_playingFileName`, name: 'Playing File Name' },
      { variableId: `${instanceName}_playingStarted`, name: 'Playing Started' },
      { variableId: `${instanceName}_playingAudioOnly`, name: 'Playing Audio Only' },
      { variableId: `${instanceName}_playingTotalFrames`, name: 'Playing Total Frames' },
      { variableId: `${instanceName}_playingRunningFrame`, name: 'Playing Running Frame' },
      { variableId: `${instanceName}_playingFPS`, name: 'Playing FPS' },
      { variableId: `${instanceName}_playingStartTime`, name: 'Playing Start Time' },
      { variableId: `${instanceName}_playingName`, name: 'Playing Name' },
    ]

    // Register variable definitions
    this.setVariableDefinitions(variableDefinitions)
  }

  initFeedbacks() {
    const feedbacks = {
      session_status: {
        type: 'boolean',
        name: 'Session Status',
        description: 'Check if the session status indicates captioning is active',
        options: [],
        defaultStyle: {
          color: combineRgb(255, 255, 255),
          bgcolor: combineRgb(0, 204, 0),
        },
        callback: (feedback) => {
          const instanceName = this.config.label || 'watson_instance'
          const sessionStatus = this.getVariableValue(`${instanceName}_session_status`)
          return sessionStatus === '1' // Return true if session_status is '1', otherwise false
        },
      },
      is_output_muted: {
        type: 'boolean',
        name: 'Output Muted',
        description: 'Check if the output is muted/ captioning is paused',
        options: [],
        defaultStyle: {
          color: combineRgb(255, 255, 255),
          bgcolor: combineRgb(255, 0, 0),
        },
        callback: (feedback) => {
          const instanceName = this.config.label || 'watson_instance'
          const isOutputMuted = this.getVariableValue(`${instanceName}_isOutputMuted`)
          return isOutputMuted === '1' // Return true if isOutputMuted is '1', otherwise false
        },
      },
    }

    this.setFeedbackDefinitions(feedbacks)
  }

  initPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
    }

    this.pollingInterval = setInterval(() => {
      this.fetchStatus()
    }, 1000)
  }

  async fetchStatus() {
    const url = `${this.config.url}/session_status`
    try {
      const response = await got.get(url, { https: { rejectUnauthorized: this.config.rejectUnauthorized }, responseType: 'json' })
      const statusData = response.body

      this.log('info', `Status Data: ${JSON.stringify(statusData)}`)

      const instanceName = this.config.label || 'watson_instance'

      // Dynamically update custom variables with the instance name
      const variables = {}
      for (const [key, value] of Object.entries(statusData)) {
        const variableName = `${instanceName}_${key}`
        variables[variableName] = value
      }
      this.setVariableValues(variables)

      // Check and update feedbacks
      this.checkFeedbacks('session_status')
      this.checkFeedbacks('is_output_muted')

      this.updateStatus(InstanceStatus.Ok)
    } catch (e) {
      this.log('error', `HTTP GET Request for status failed (${e.message})`)
      this.updateStatus(InstanceStatus.UnknownError, e.code)
    }
  }
}

runEntrypoint(WatsonCaptioningInstance, upgradeScripts)
