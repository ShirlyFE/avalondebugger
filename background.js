(function() {
    //tabId -> devtool port
    var panelPorts = {},
        panelFrames = {},
        panelAvalon = {},
        panelDebugMode = {}

    // context script -> background
    chrome.runtime.onMessage.addListener(handleContentScriptMessage)

    chrome.runtime.onConnect.addListener(handleDevtoolConnectMessage)

    chrome.tabs.onUpdated.addListener(handleTabUpdate)

    function handleContentScriptMessage (message, sender, sendResponse) {
        console.log('content script 发给background的消息，argument是：')
        console.log(arguments)
        if (sender.tab) {
            var tabId = sender.tab.id,
                port = panelPorts[tabId]

            switch(message.name) {
                case 'bglog': // 来自avalon dev panel的log请求
                    console.log(message.obj)
                break
                case 'vmtree': // 来自inject.js中的页面avalon vmodel解析数据
                    port.postMessage({
                        name: 'vmtree',
                        pageInfo: message.pageInfo
                    })
                break
                case 'nestObj':
                case 'vmodel':
                    port.postMessage({
                        name: message.name,
                        vmodel: message.vmodel
                    })
                break
                case 'frameUrl':
                    var frameUrl = panelFrames[tabId],
                        messageUrl = message.frameURL,
                        debugModeObj = panelDebugMode[tabId]

                    if (frameUrl && frameUrl !== messageUrl) {
                        debugModeObj && (debugModeObj.debugMode = false)
                        if (port) {
                            port.postMessage({
                                name: 'stopDebug'
                            })
                        }
                    }
                    panelFrames[tabId] = messageUrl
                break
                case 'avalon':
                    panelAvalon[tabId] = message.avalon
                    if (port) {
                        port.postMessage({
                            name: 'avalon',
                            avalon: message.avalon
                        })
                    }
                break
                // case 'avalonNotInUse':
                //     if (port) {
                //         port.postMessage({
                //             name: 'avalonNotInUse'
                //         })
                //     }
                // break
                case 'parseError':
                    if (port) {
                        port.postMessage({
                            name: 'parseError'
                        })
                    }
                break
            }
        }
    }

    function handleDevtoolConnectMessage(devToolsPort) { 
        var tabId = -1

        if (devToolsPort.name !== 'avalondevtoolspanel') return
        
        devToolsPort.onMessage.addListener(registerInspectedTabId)
        
        function registerInspectedTabId(message) {
            console.log('devtool 发给background的消息， message is：')
            console.log(message)
            console.log('devtool 发消息来时 时panelPorts、panelFrames、panelValon、panelDebugMode')
            console.log(panelPorts)
            console.log(panelFrames)
            console.log(panelAvalon)
            console.log(panelDebugMode)
            switch(message.name) {
                case 'identification':

                    tabId = message.data
                    panelPorts[tabId] = devToolsPort
                    panelDebugMode[tabId] = {}
                    devToolsPort.onDisconnect.addListener(function() {
                        handlePanelDisconnect(tabId)
                    })
                break
                case 'debugMode':
                    panelDebugMode[tabId].debugMode = message.debug
                break
                default:
                    handlePanelMessage(message, tabId)
            }
        }
    }

    function handlePanelMessage (message, tabId) {
        var port = panelPorts[tabId]

        if (panelDebugMode[tabId].debugMode) {
            message.frameURL = panelFrames[tabId]
            message.avalon = panelAvalon[tabId]
            chrome.tabs.sendMessage(tabId, message)
            port.postMessage({
                name: 'waiting',
                data: '等待页面解析完成....'
            })
        }
    }

    function handlePanelDisconnect (tabId) {

        chrome.tabs.sendMessage(tabId, {
            name: 'avalonpaneldisconnect'
        })
        delete panelPorts[tabId]
        delete panelFrames[tabId]
        delete panelAvalon[tabId]
    }

    function handleTabUpdate(updatedTabId, changeInfo, sender) {
        var debugModeObj = panelDebugMode[updatedTabId],
            port = panelPorts[updatedTabId]
        console.log('tab updated, arguments')
        console.log(arguments)
        console.log(panelPorts)
        console.log(panelDebugMode)
        console.log(panelFrames)
        console.log(panelAvalon)
        // the event is emitted a second time when the update is complete, but we only need the first one.
        if (changeInfo.status == 'loading') {
            var url = sender.url,
                portFrameUrl = panelFrames[updatedTabId]

            if (portFrameUrl && url !== portFrameUrl) {
                debugModeObj && (debugModeObj.debugMode = false)
                panelFrames[updatedTabId] = url
                if (port) {
                    port.postMessage({
                        name: 'stopDebug'
                    })
                }
            }
        }
        if (changeInfo.status == 'complete') {
            if (port && debugModeObj.debugMode) {
                port.postMessage({
                    name: 'updated'
                })
            }
        }
    }

    // chrome.runtime.onInstalled.addListener(function(details) {
        
    //         details信息有previousVersionhe reason
    //         []
        
    //     if (details.reason == 'update') {
    //         chrome.tabs.create({url: chrome.extension.getURL('updated.html')});
    //     }
    // });
})()
