new (function ContentScript() {
    this.frameURL = window.location.href
    this.injectedElement = []
    this.eventProxyElement = null

    this.initialize = function() {
        this.sendFrameUrl()
        this.listenToBackground()
        this.injectExtensionCode()
        this.listenToInjectedMessage()
    }
    this.sendFrameUrl = function() {
        chrome.runtime.sendMessage({
            name: 'frameUrl',
            frameURL: this.frameURL
        })
    }
    // Receives messages from the background and redirects them to the inspected page.
    this.listenToBackground = function() {
        chrome.runtime.onMessage.addListener((function(message) {
            console.log('来自backgroun的消息，消息内容是：')
            console.log(message)
            switch(message.name) {
                case 'avalonpaneldisconnect':
                    this.clearInjectedContent()
                break
                case 'vmtree':
                    if (message.frameURL != this.frameURL) return
                    // if (message.avalon) {
                        this.parseVM()  
                    // } else {
                    //     var customEvent = document.createEvent('Event'),
                    //         eventProxyElement = this.eventProxyElement

                    //     customEvent.initEvent('avalon', true, true)
                    //     eventProxyElement.dispatchEvent(customEvent)
                    // }
                break
            }
        }).bind(this))
    }

    this.parseVM = function() {
        var doc = document.body.getElementsByTagName('*'),
            docLen = doc.length,
            timer = null,
            vmtree = [],
            that = this

        timer = setTimeout(sendMessage, 1000)
        function sendMessage() {
            var currentDocLen = doc.length
            clearTimeout(timer)
            timer = null
            if (docLen === currentDocLen) {
                /* 
                    在content script中只可以操作页面dom但是无法访问页面的js,像下面这样访问页面avalon是不可能的
                    avalonInUse = window.avalon && window.avalon.version && window.avalon.bindingHandlers ? true : false
                */
                that.anaysisVmodel(document.body, vmtree)
                /* 
                    message最终会转换为json串，在这里给vmtree设置toggle方法毫无意义，所以将vmtree的信息完善工作放在popup js里去做
                    本来是要根据用户的窗口大小来决定popup的窗口大小的，但是发现chrome给popup设定了width最大800和height最大600的限制，超过大小会显示滚动条，因此就直接显式的设置了popup的width和height
                */
                if (vmtree.length) {
                    chrome.runtime.sendMessage({
                        name: 'vmtree',
                        pageInfo: {
                            tree: vmtree
                        }
                    })
                } else {
                    chrome.runtime.sendMessage({
                        name: 'parseError'
                    })
                }
            } else {
                docLen = doc.length
                timer = setTimeout(sendMessage, 1000)
            }
        }
    }

    /*
     * description: 遍历页面元素获取页面vmodel的嵌套关系
     */
    this.anaysisVmodel = function (parent, vmtree) {
        var vmodel = parent.getAttribute('avalonctrl'),
            subVm = vmtree,
            identifier = ''
        if (vmodel) {
            identifier = 'vm_' + String(Math.random()).substr(2)
            parent.setAttribute('identifier', identifier)
            subVm = {name: vmodel, vmtree: [], identifier: identifier}
            vmtree.push(subVm)
        }
        var childNodes = parent.children,
            childNodesLen = childNodes.length

        if (childNodesLen) {
            for (var i = 0; i < childNodesLen; i++) {
                this.anaysisVmodel(childNodes[i], subVm.vmtree || subVm)
            }
        }
    }
    // 向inspected page注入extension需要的dom和js
    this.injectExtensionCode = function() {
        var html = document.getElementsByTagName('html')[0],
            eventProxyElement = document.createElement('div'),
            script = window.document.createElement('script')

        eventProxyElement.id = '__avalonVmodelElement'
        eventProxyElement.style.display = 'none'
        html.appendChild(eventProxyElement)

        eventProxyElement.setAttribute('ms-attr-vmid', 'vmid')
        script.src = chrome.extension.getURL('hint.js')
        html.appendChild(script)

        this.eventProxyElement = eventProxyElement
        this.injectedElement = [script, eventProxyElement]
    }
    this.listenToInjectedMessage = function() {
        var eventProxyElement = this.eventProxyElement,
            that = this
        eventProxyElement.addEventListener('avalonVmodel', function () {

            var eventData = JSON.parse(eventProxyElement.innerText),
                messageType = eventData.name,
                message = eventData.val
            console.log('hint js 发送给content script的消息')
            console.log('eventData is : ')
            console.log(eventData)
            switch(messageType) {
                case 'avalon':
                    chrome.extension.sendMessage({
                        name: 'avalon',
                        avalon: message
                    })
                break
                case 'clearOk':
                    var injectedElement = that.injectedElement
                    for (var i = 0, len = injectedElement.length; i < len; i++) {
                        var element = injectedElement[i]
                        element.textContent = element.innerHTML = ''
                        element.parentNode.removeChild(element)
                    }
                break
                // case 'avalonAgain':
                //     if (message) {
                //         that.parseVM()
                //     } else {
                //         chrome.extension.sendMessage({
                //             name: 'avalonNotInUse'
                //         })
                //     }
                // break
                default: 
                    chrome.extension.sendMessage({
                        name: messageType,
                        vmodel: message
                    })
            }
        })
    }

    this.clearInjectedContent = function() {
        var customEvent = document.createEvent('Event'),
            eventProxyElement = this.eventProxyElement

        customEvent.initEvent('clearInjected', true, true)
        eventProxyElement.innerText = 'clearInjectedContent'
        eventProxyElement.dispatchEvent(customEvent)
    }
    this.initialize()
})()
    

