//tabId -> devtool port
var panelPorts = {}
var panelFrames = {}
var panelPageReady = {} 

var handleContentScriptMessage = function(message, sender, sendResponse) {
    console.log('content script message : arguments ')
    console.log(arguments)
    if (sender.tab) {
        var tabId = sender.tab.id,
            port = panelPorts[tabId]
        console.log('message.name : '+message.name)
        console.log('message.obj : ')
        console.log(message.obj)
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
                console.log('panelPorts : ')
                console.log(panelPorts)
                port.postMessage({
                    name: message.name,
                    vmodel: message.vmodel
                })
            break
            case 'connect':
                // panelFrames[tabId] = message.frameURL
            break
            case 'ready':
                panelFrames[tabId] = message.frameURL
                panelPageReady[tabId] = true
                if (port) {
                    port.postMessage({
                        name: 'ready'
                    })
                }
                console.log('page ready 可以获取VMtree了')
            break
        }
    }
}

// context script -> background
chrome.runtime.onMessage.addListener(handleContentScriptMessage)

chrome.runtime.onConnect.addListener(function(devToolsPort) {
    console.log('devtools connect comming , and arguments')
    console.log(devToolsPort)
    if (devToolsPort.name !== 'avalondevtoolspanel') return

    devToolsPort.onMessage.addListener(registerInspectedTabId)
    var tabId = -1
    function registerInspectedTabId(message) {
        console.log('devToolsPort message : ')
        console.log(message)
        if (message.name === 'identification') {
            tabId = message.data
            panelPorts[tabId] = devToolsPort
            devToolsPort.onDisconnect.addListener(function() {
                handlePanelDisconnect(tabId)
            })
        } else {
            handlePanelMessage(message, tabId)
        }
    }
})
function handlePanelMessage (message, tabId) {
    var port = panelPorts[tabId]
    console.log('handlePanelMessage : ')
    console.log(arguments)
    console.log('panelPageReady : ')
    console.log(panelPageReady)
    console.log('panelFrames : ')
    console.log(panelFrames)
    if (panelPageReady[tabId]) {
        message.frameURL = panelFrames[tabId]
        chrome.tabs.sendMessage(tabId, message)
    } else {
        chrome.tabs.sendMessage(tabId, {
            name: 'connect'
        })
        port.postMessage({
            name: 'waiting',
            data: '等待页面解析完成....'
        })
    }
}

function handlePanelDisconnect (tabId) {
    console.log('panel disconnect arguments :')
    console.log(arguments)
    chrome.tabs.sendMessage(tabId, {
        name: 'avalonpaneldisconnect'
    })
    delete panelPorts[tabId]
    delete panelFrames[tabId]
    delete panelPageReady[tabId]

}

chrome.tabs.onUpdated.addListener(function(updatedTabId, changeInfo) {
    // the event is emitted a second time when the update is complete, but we only need the first one.
    console.log('tabs updated , and the arguments: ')
    console.log(arguments)
    if (changeInfo.status == 'complete') {
        var port = panelPorts[updatedTabId]
        console.log('panelPorts is : ')
        console.log(panelPorts)
        if (port) {
            port.postMessage({
                name: 'updated'
            })
        }
    }
})

// chrome.runtime.onInstalled.addListener(function(details) {
    
//         details信息有previousVersionhe reason
//         []
    
//     if (details.reason == 'update') {
//         chrome.tabs.create({url: chrome.extension.getURL('updated.html')});
//     }
// });

