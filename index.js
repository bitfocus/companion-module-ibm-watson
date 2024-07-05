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
    this.initPresets()
    this.initPolling()
  }

  init(config) {
    this.config = config
    this.updateStatus(InstanceStatus.Ok)
    this.initActions()
    this.initVariables()
    this.initFeedbacks()
    this.initPresets()
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
      toggle_captioning_state: {
        name: 'Toggle Captioning State',
        options: [],
        callback: async (action, context) => {
          await this.toggleCaptioningState()
        },
      },
    })
  }

  async toggleCaptioningState() {
    const instanceName = this.config.label || 'watson_instance'
    const sessionStatus = this.getVariableValue(`${instanceName}_session_status`)

    if (sessionStatus === '1') {
      // If captioning is active, stop it
      const url = `${this.config.url}/session_close`
      try {
        await got.get(url, { https: { rejectUnauthorized: this.config.rejectUnauthorized } })
        this.updateStatus(InstanceStatus.Ok)
      } catch (e) {
        this.log('error', `HTTP GET Request failed (${e.message})`)
        this.updateStatus(InstanceStatus.UnknownError, e.code)
      }
    } else {
      // If captioning is not active, start it
      const url = `${this.config.url}/begin_transcript`
      try {
        await got.get(url, { https: { rejectUnauthorized: this.config.rejectUnauthorized } })
        this.updateStatus(InstanceStatus.Ok)
      } catch (e) {
        this.log('error', `HTTP GET Request failed (${e.message})`)
        this.updateStatus(InstanceStatus.UnknownError, e.code)
      }
    }
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
        description: 'Check if the output is muted',
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

  initPresets() {
    this.setPresetDefinitions({
             
      startCaptioning: {
        type: 'button',
        category: 'Control', 
        name: 'Start Captioning', 
        style: {
          text: 'Start CC',  
          size: '14',
          png64: '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',
          alignment: 'right:bottom',  
          pngalignment: 'center:top',
          color: combineRgb(255, 255, 255),
          bgcolor: combineRgb(0, 55, 0),
          show_topbar: false
        },
        feedbacks: [
          {
            feedbackId: 'session_status',
            style: {
              color: combineRgb(0, 0, 0),
              bgcolor: combineRgb(0, 204, 0),
            },
            isInverted: false
          }
        ],
        steps: [
          {
            down: [
              {
                actionId: 'toggle_captioning_state',
                options: {},
                delay: 0  
              }
            ],
            up: []
          }
        ],
        options: {
          runWhileHeld: []  
        }
      },
      stopCaptioning: {
        type: 'button',
        category: 'Control', 
        name: 'Stop Captioning', 
        style: {
          text: 'Stop CC',  
          size: '14',
          png64: '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',
          alignment: 'right:bottom',  
          pngalignment: 'center:top',
          color: combineRgb(255, 255, 255),
          bgcolor: combineRgb(100, 0, 0),
          show_topbar: false
        },
        feedbacks: [
          {
            feedbackId: 'session_status',
            style: {
              color: combineRgb(0, 0, 0),
              bgcolor: combineRgb(255, 0, 0),
            },
            isInverted: false
          }
        ],
        steps: [
          {
            down: [
              {
                actionId: 'toggle_captioning_state',
                options: {},
                delay: 0  
              }
            ],
            up: []
          }
        ],
        options: {
          runWhileHeld: []  
        }
      },
      toggleCaptioning: {
        type: 'button',
        category: 'Control', 
        name: 'Toggle Captioning', 
        style: {
          text: 'Toggle',  
          size: '18',
          png64: 'iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAABGdBTUEAALGPC/xhBQAACklpQ0NQc1JHQiBJRUM2MTk2Ni0yLjEAAEiJnVN3WJP3Fj7f92UPVkLY8LGXbIEAIiOsCMgQWaIQkgBhhBASQMWFiApWFBURnEhVxILVCkidiOKgKLhnQYqIWotVXDjuH9yntX167+3t+9f7vOec5/zOec8PgBESJpHmomoAOVKFPDrYH49PSMTJvYACFUjgBCAQ5svCZwXFAADwA3l4fnSwP/wBr28AAgBw1S4kEsfh/4O6UCZXACCRAOAiEucLAZBSAMguVMgUAMgYALBTs2QKAJQAAGx5fEIiAKoNAOz0ST4FANipk9wXANiiHKkIAI0BAJkoRyQCQLsAYFWBUiwCwMIAoKxAIi4EwK4BgFm2MkcCgL0FAHaOWJAPQGAAgJlCLMwAIDgCAEMeE80DIEwDoDDSv+CpX3CFuEgBAMDLlc2XS9IzFLiV0Bp38vDg4iHiwmyxQmEXKRBmCeQinJebIxNI5wNMzgwAABr50cH+OD+Q5+bk4eZm52zv9MWi/mvwbyI+IfHf/ryMAgQAEE7P79pf5eXWA3DHAbB1v2upWwDaVgBo3/ldM9sJoFoK0Hr5i3k4/EAenqFQyDwdHAoLC+0lYqG9MOOLPv8z4W/gi372/EAe/tt68ABxmkCZrcCjg/1xYW52rlKO58sEQjFu9+cj/seFf/2OKdHiNLFcLBWK8ViJuFAiTcd5uVKRRCHJleIS6X8y8R+W/QmTdw0ArIZPwE62B7XLbMB+7gECiw5Y0nYAQH7zLYwaC5EAEGc0Mnn3AACTv/mPQCsBAM2XpOMAALzoGFyolBdMxggAAESggSqwQQcMwRSswA6cwR28wBcCYQZEQAwkwDwQQgbkgBwKoRiWQRlUwDrYBLWwAxqgEZrhELTBMTgN5+ASXIHrcBcGYBiewhi8hgkEQcgIE2EhOogRYo7YIs4IF5mOBCJhSDSSgKQg6YgUUSLFyHKkAqlCapFdSCPyLXIUOY1cQPqQ28ggMor8irxHMZSBslED1AJ1QLmoHxqKxqBz0XQ0D12AlqJr0Rq0Hj2AtqKn0UvodXQAfYqOY4DRMQ5mjNlhXIyHRWCJWBomxxZj5Vg1Vo81Yx1YN3YVG8CeYe8IJAKLgBPsCF6EEMJsgpCQR1hMWEOoJewjtBK6CFcJg4Qxwicik6hPtCV6EvnEeGI6sZBYRqwm7iEeIZ4lXicOE1+TSCQOyZLkTgohJZAySQtJa0jbSC2kU6Q+0hBpnEwm65Btyd7kCLKArCCXkbeQD5BPkvvJw+S3FDrFiOJMCaIkUqSUEko1ZT/lBKWfMkKZoKpRzame1AiqiDqfWkltoHZQL1OHqRM0dZolzZsWQ8ukLaPV0JppZ2n3aC/pdLoJ3YMeRZfQl9Jr6Afp5+mD9HcMDYYNg8dIYigZaxl7GacYtxkvmUymBdOXmchUMNcyG5lnmA+Yb1VYKvYqfBWRyhKVOpVWlX6V56pUVXNVP9V5qgtUq1UPq15WfaZGVbNQ46kJ1Bar1akdVbupNq7OUndSj1DPUV+jvl/9gvpjDbKGhUaghkijVGO3xhmNIRbGMmXxWELWclYD6yxrmE1iW7L57Ex2Bfsbdi97TFNDc6pmrGaRZp3mcc0BDsax4PA52ZxKziHODc57LQMtPy2x1mqtZq1+rTfaetq+2mLtcu0W7eva73VwnUCdLJ31Om0693UJuja6UbqFutt1z+o+02PreekJ9cr1Dund0Uf1bfSj9Rfq79bv0R83MDQINpAZbDE4Y/DMkGPoa5hpuNHwhOGoEctoupHEaKPRSaMnuCbuh2fjNXgXPmasbxxirDTeZdxrPGFiaTLbpMSkxeS+Kc2Ua5pmutG003TMzMgs3KzYrMnsjjnVnGueYb7ZvNv8jYWlRZzFSos2i8eW2pZ8ywWWTZb3rJhWPlZ5VvVW16xJ1lzrLOtt1ldsUBtXmwybOpvLtqitm63Edptt3xTiFI8p0in1U27aMez87ArsmuwG7Tn2YfYl9m32zx3MHBId1jt0O3xydHXMdmxwvOuk4TTDqcSpw+lXZxtnoXOd8zUXpkuQyxKXdpcXU22niqdun3rLleUa7rrStdP1o5u7m9yt2W3U3cw9xX2r+00umxvJXcM970H08PdY4nHM452nm6fC85DnL152Xlle+70eT7OcJp7WMG3I28Rb4L3Le2A6Pj1l+s7pAz7GPgKfep+Hvqa+It89viN+1n6Zfgf8nvs7+sv9j/i/4XnyFvFOBWABwQHlAb2BGoGzA2sDHwSZBKUHNQWNBbsGLww+FUIMCQ1ZH3KTb8AX8hv5YzPcZyya0RXKCJ0VWhv6MMwmTB7WEY6GzwjfEH5vpvlM6cy2CIjgR2yIuB9pGZkX+X0UKSoyqi7qUbRTdHF09yzWrORZ+2e9jvGPqYy5O9tqtnJ2Z6xqbFJsY+ybuIC4qriBeIf4RfGXEnQTJAntieTE2MQ9ieNzAudsmjOc5JpUlnRjruXcorkX5unOy553PFk1WZB8OIWYEpeyP+WDIEJQLxhP5aduTR0T8oSbhU9FvqKNolGxt7hKPJLmnVaV9jjdO31D+miGT0Z1xjMJT1IreZEZkrkj801WRNberM/ZcdktOZSclJyjUg1plrQr1zC3KLdPZisrkw3keeZtyhuTh8r35CP5c/PbFWyFTNGjtFKuUA4WTC+oK3hbGFt4uEi9SFrUM99m/ur5IwuCFny9kLBQuLCz2Lh4WfHgIr9FuxYji1MXdy4xXVK6ZHhp8NJ9y2jLspb9UOJYUlXyannc8o5Sg9KlpUMrglc0lamUycturvRauWMVYZVkVe9ql9VbVn8qF5VfrHCsqK74sEa45uJXTl/VfPV5bdra3kq3yu3rSOuk626s91m/r0q9akHV0IbwDa0b8Y3lG19tSt50oXpq9Y7NtM3KzQM1YTXtW8y2rNvyoTaj9nqdf13LVv2tq7e+2Sba1r/dd3vzDoMdFTve75TsvLUreFdrvUV99W7S7oLdjxpiG7q/5n7duEd3T8Wej3ulewf2Re/ranRvbNyvv7+yCW1SNo0eSDpw5ZuAb9qb7Zp3tXBaKg7CQeXBJ9+mfHvjUOihzsPcw83fmX+39QjrSHkr0jq/dawto22gPaG97+iMo50dXh1Hvrf/fu8x42N1xzWPV56gnSg98fnkgpPjp2Snnp1OPz3Umdx590z8mWtdUV29Z0PPnj8XdO5Mt1/3yfPe549d8Lxw9CL3Ytslt0utPa49R35w/eFIr1tv62X3y+1XPK509E3rO9Hv03/6asDVc9f41y5dn3m978bsG7duJt0cuCW69fh29u0XdwruTNxdeo94r/y+2v3qB/oP6n+0/rFlwG3g+GDAYM/DWQ/vDgmHnv6U/9OH4dJHzEfVI0YjjY+dHx8bDRq98mTOk+GnsqcTz8p+Vv9563Or59/94vtLz1j82PAL+YvPv655qfNy76uprzrHI8cfvM55PfGm/K3O233vuO+638e9H5ko/ED+UPPR+mPHp9BP9z7nfP78L/eE8/stRzjPAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAJcEhZcwAACxMAAAsTAQCanBgAAAsUSURBVHic7Zx7jB1VHcc/+9620G4LpbRFWkpbEYgEimBCykO2PigqSBajBBBjFgXBGBK2/sHzH6GpiI9EWxQVjGKbSIQiJLQgjxiCLaAiKkh5pDxrH7S03V3a/frH7zfMubP3zr0zc7dL3ftNJjP3zDnnN/O9v3PO73HubZLEfoyFwI3AtcBjo/EAzaMhtI74OnC6n0cF+zuBLYnzPkeSwOWA/OirUB5hclD2YsHnyEvAUOK8r+S+jySBa4LrOcF1d5nrsGxVAflXAQ8Bs3L2kRezXO5VFBiJaQQu8PMcSskMy8u1yyr/IuBUYGnOPvJiqcu9iDoSuJWYjIioHj9v8HNSA8M2WbEHuAGbBs4Fzs7Yvj1xrhVnuzy5/D0Z27+PcsyHZHQTa9qaoAxigvMO3wgPAPcCbcA1wPgMbf8BDPq5VoxzOW0u94EMbYdDUvJYoBi9kl7067C8O1GnXD9ZjmMk9Xt/fRnadUj6iJ9rbdPncvpdbqFnr3QjIu0mP2/x8gf98/KAwMl1IBBJ13h/r0uaV6c+k8c8718ur3CflSbPaLj2JT6v93N3UL610BCIsQJ4GZiOeRgjgYXe/8surzCqEZj8HJ2T82I98BZwFnAesDKlXjM2f3UCExJHJ9Ca0nal93+WyyuMJpX3hScDW4LPRxKvwqpQPpJoAyYCU4HD/LoDI6sZW4W7vLwV+DfwT+AFSt+j7qhE4AcFrcA04BDgYIygZqCJ0tEzDjgIOBA4HDgK08jNwOPAz7FhW3eMFIGtmIbszNm+GSNjKmbWjAfe82M7NvzeC+oLc+cWAUuA0ygleAC4E7geeC3nM03wfkpsxpEKJqwC1gJfyiljHDaNTMSIHADexcjb6/cOxIbuHmAK8EPgd8AZLnMzpnVvY1/m1/yZPpHxWZr9PdZSxuZN08DJQC+24i7wz5HXsYL0BeR5YJ5fP4zF7P5U4wN/2OWdhs19OzHyhrChOwT0Y2RuBmYClxH70o8APwVWY+S2AlcC12GED2Lxw6WUzuflcLrXPcM/vwDMDytUIzBtAl5EZRJnA1djX0AL9tK/xYh8vkKbLq//aWy+ewt4FdOgTcA2jLgWjNjdwJnABdjqux1YBtwBvFKm/x8AlxNHYK7H3LhymI8RF42gvZjSLCU5l1YxFHtlHkjSipekdTUYmsdLWh202S7pvDL1jpH0hKRNkl6S9DNJF0o6WFK7pBZJTUH9FknXB/0+LPOOjpZ0rKQjJU1TqYcyR9Ljkl4O2i1J9Is/3/agzmp/j0yeSHRMdtIeVOydhKjVYv+spKck7dZw1+/jkl71/p6TdL6k8VX6uzp4hl9KmuDlEyXNlDRL0uF+PdHvdUn6nqSfSHrA2w5I+lyi715/zqf8uVPfLe3mnAqk5SEQmTZ0JcpmSHrN+3pSpkHV+rlE0t6AvHJ12iRNkXSoYi0eL+kySTdKOkLSr72PrU502L5LNfrXaTdXBkQtd0IpQGC54zbvZ6Oko2qo3y1pl7e5U8OHX/Jol2lnm0wTL5V0naTDJB0imy4kmzKq9ZWZwEpE1YvAhU7GoKSLaqg/T9I2l3ufk1OrrCZJkyRdKela2RyJpC/LojKDkk7P8x5pNloYJIiCqstT6mfF8Zi99xfMfktDO2bnTcJW2Esxc6RWCFtNO7GVfMDLV7n8NsxHzow0AsNoxUp/iF7qE31pI44+/534hSrh25h5sxMziDfmkDkO+yJ2YvYjmDdzm19fTo68TBqBS4CbiQlbA5xPHNIqgknEIatHqtQ9ithe+zH5I0AfAnZhtu1u4nf/DfaFNGE5kkyo5mYtwdykyGju8esmP/IiGk57schJJbQBt2Ku2F8xbyIvpmIEPuuf2zF3cC/mpgEsztppWuwsxINZO66C6ItrwsiphE9ivute4DtUH+qV0IF5ILuA14OyAzAv6THgYiw810R1F+99jNbOhBbMPWsmTk4lMQFzp9qAPwD3F5B3uMt8kzhCtBuL8hzkz4Jfz8zScTUCuxn+bUS7EbqHV68JbZiTH20GOrlCvVOBk7AXvSanLIhDY4NY8LffywcxzZ6GDecdmA8+PWvn+xpt2LB5yj/PZnhet4144bgHeK6AvAOw+XYzw8P4WzAtnIityB1kS6tWJXA9tmiEWORHkdW4A4tq9AMnMlybFwLHYS+1rIAcsGE5iA3THYl727B5dRI2xDNHl6sRWG7XwRqKZeOEDanHvZ9O4IrgfhPweUwrHwL+llMO3ncU+qoUiR7CSJ6ALTLbswgYjSEcDZUpWK5CmJF8rt+fBVzo1/eRzeMI0YRp1hA2VPsr1Hsbi322YsP89Qr1ymI0CNyDETgbeAK4y8tvwibxQ7EX2gjcXkDOeJczgBFYaXjuIF44NpEx3VmrHRgiCu0XQT+mHbOwFfY0LAq8jPgFNlIsKTXRr98l3X5sx7wdgH/lEVQLwtzvcko3X+bBO5hn8DHv+5tefjG2Xw/M9suLLmzui7J4aVgAzM0rs1YCw2xUDzbcimAT9oJzsYTN3ViOAuKcxX05+x5HbIq8g9l6aTjHn2UX8GRWYbUSeDOlgYWiuxF2As9gDv6Z2Gp5AxYsiLbrfgObLrIg2qHQhM1tu6rUnwac4tffB97IKK9qTmQkjyMk3SXpzx7YRNIZire5SZYEOq7G/lpkUeYo2lxLhHmZyxmQdGq9A6ojjZewKMhBWN52NqZ9LcB/Me05BbMXryDdQ2jCtLUDG7Jpq26EM7E4I8CvgEdzvMOoaiCSDpR0r6Sdkn4vqUfSe66Vn5H0WKCNT7imtiX6aJZlD2dKmq7akkGLFacHNshSoLneoZZKPYo3Vsqvu+tI4nGK05ovyobTG7IcRoukGyS9Gch/RpZ6PMHbt8sybweXITd5HCvpu5KGvK/Nkk4u8vzVKvSqPHrqSCCSviDTvBDhix0t6VZZvjbCO5LukeV6L5Y0V5aB63BSO/3zfElflXS7pLeD9oMqn+SvK4FhXniObKj0qn7besPjAkk7Anmry9SZIekWWdI7iQFZlu8lSc9KekXSuypdlCJsl/TFejx3te1tW4hNiSVYoqleW3rLYTHwC8zIHsL2udyCeQhTgRlerxOL1swAjsZiil2YWdbqbXdgC9KkhIxNwFeAP9bliaswHO6FkWyzeZZd9HmOeZLWJjTraUl3u+xzZDvzW4I2zf65Q7YwzZLtYPiRa2GE+1XnDey1bLDs8yM0am/GNHKk0Inlfr8FHBGUb8B2dz0KPI35zbsx82U65tnMx3zbMI75LKbJd1DdM8mELDtU+4hduK1YOGqkMR64BPgUllyakLg/hNl7yS2/YHbkWuyHNLdTOZxVCNUI7MO+9VXYzvzoV5n7isAQJwEfxbTrBD93Bfe3YSnSJ4H/YGnQzL5tVlQjsNLNKOk+5pHmyk3GVt0w97EGm5sa5Dk+6D9z+MBjf//J/6ijFgJ7sa0dUUJ9HcUj0v83qDaEVxLvDUxiPZbTHdNI08BeYvLWYxtvphAvKgtoaGKqBq4j3vhzIqXErfPrMa+FaQSGN5J7AdPujSk0VuGCSCMwNKB7KlzX8wfX+yXSdiasIN6VH+7OD3PCRf+xY79HNTNmObYal8MKzK0b06jFlYvMmfCPJlZRpz9t2N/R8IULorEKF0SDwIJIIzD8H8FuzPuI/iuwkn885lCLJ7KB0r+6i3A+DTOmpiE8ByNxCaXGdSXzZkyhVl84+oeiMLEEY9wPhnzBhEYgIUBjFS6IBoEF0SCwIBoEFkSDwIJIiwdWWmHH/MoboqGBBdEgsCD+Bxp16XNrJJMiAAAAAElFTkSuQmCC',
          alignment: 'right:bottom',  
          pngalignment: 'center:top',
          color: combineRgb(255, 255, 255),
          bgcolor: combineRgb(245, 0, 0),
          show_topbar: false
        },
        feedbacks: [
          {
            feedbackId: 'session_status',
            style: {
              color: combineRgb(0, 0, 0),
              bgcolor: combineRgb(0, 204, 0),
            },
            isInverted: false
          }
        ],
        steps: [
          {
            down: [
              {
                actionId: 'toggle_captioning_state',
                options: {},
                delay: 0  
              }
            ],
            up: []
          }
        ],
        options: {
          runWhileHeld: []  
        }
      },
    })
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
      const response = await got.get(url, { responseType: 'json' })
      const statusData = response.body

      //this.log('info', `Status Data: ${JSON.stringify(statusData)}`)

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

      this.updateStatus(InstanceStatus.Ok)
    } catch (e) {
      this.log('error', `HTTP GET Request for status failed (${e.message})`)
      this.updateStatus(InstanceStatus.UnknownError, e.code)
    }
  }
}

runEntrypoint(WatsonCaptioningInstance, upgradeScripts)
