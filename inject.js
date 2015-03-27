var contentScript = new (function() {
    this.frameURL = window.location.href
    this.isTopFrame = (window.parent == window)
    this.vmtree = []
    this.injectedElement = []
    this.avalonInUse = false
    console.log('this.frameURL : ')
    console.log(this.frameURL)
    this.initialize = function() {
        this.listenToBackground()
        console.log('this.isTopFrame : ' + this.isTopFrame)

        if (this.isTopFrame) this.ifTopFrame()
    }

    // Receives messages from the background and redirects them to the inspected page.
    this.listenToBackground = function() {
        chrome.runtime.onMessage.addListener((function(message) {
            console.log('background message comming, and arguments : ')
            console.log(arguments)
            switch(message.name) {
                case 'connect':
                    this.ifTopFrame()
                break
                case 'avalonpaneldisconnect':
                    this.clearInjectedContent()
                break
                case 'vmtree':
                    if (message.frameURL != this.frameURL) return
                    if (this.vmtree.length) {
                        chrome.runtime.sendMessage({
                            name: 'vmtree',
                            pageInfo: {
                                tree: this.vmtree, 
                                avalon: this.avalonInUse
                            }
                        })
                    } else {
                        this.ifTopFrame()
                    }
                break
                // 得加上页面如果没有用avalon时的处理
            }
        }).bind(this))
    }

    // Code to be executed only if this is the top frame content script!
    this.ifTopFrame = function() {
        // Sends a message to the background when the DOM of the inspected page is ready
        // (typically used by the panel to check if the backbone agent is on the page).
        console.log('DOMContentLoaded : ')
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
                console.log(document.body.innerHTML)
                that.anaysisVmodel(document.body, vmtree)
                /* 
                    message最终会转换为json串，在这里给vmtree设置toggle方法毫无意义，所以将vmtree的信息完善工作放在popup js里去做
                    本来是要根据用户的窗口大小来决定popup的窗口大小的，但是发现chrome给popup设定了width最大800和height最大600的限制，超过大小会显示滚动条，因此就直接显式的设置了popup的width和height
                */
                that.vmtree = vmtree
                console.log('vmtree : ')
                console.log(vmtree)
                
                that.pageReady()
                if (that.vmtree.length) {
                    that.getAvalonVmodel()
                }
            } else {
                docLen = doc.length
                timer = setTimeout(sendMessage, 1000)
            }
        }
    }
    this.pageReady = function() {
        console.log('pageReady')
        console.log('this.frameURL is :')
        console.log(this.frameURL)
        chrome.runtime.sendMessage({
            name: 'ready',
            frameURL: this.frameURL
        })
    }

/*
 * description: 遍历页面元素获取页面vmodel的嵌套关系
 */
    this.anaysisVmodel = function (parent, vmtree) {
        var vmodel = parent.getAttribute('avalonctrl'),
            subVm = vmtree,
            identifier = ''
        if (vmodel) {
            if (!this.avalonInUse) {
                this.avalonInUse = true
            }
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

    // 获取VM对象
    this.getAvalonVmodel = function () {
        var html = document.getElementsByTagName('html')[0];
        var eventProxyElement = document.createElement('div'),
            that = this
        
        eventProxyElement.id = '__avalonVmodelElement'
        eventProxyElement.style.display = 'none'
        html.appendChild(eventProxyElement)
        eventProxyElement.setAttribute('ms-attr-vmid', 'vmid')
        // inject into the application context from the content script context

        var script = window.document.createElement('script')
        script.src = chrome.extension.getURL('hint.js')
        this.injectedElement = [script, eventProxyElement]
        eventProxyElement.addEventListener('avalonVmodel', function () {
            var eventData = eventProxyElement.innerText,
                messageType = ''
            if (eventData === 'clearOk') {
                var injectedElement = that.injectedElement
                for (var i = 0, len = injectedElement.length; i < len; i++) {
                    var element = injectedElement[i]
                    element.textContent = element.innerHTML = ''
                    element.parentNode.removeChild(element)
                }
                return
            } 
            messageType = JSON.parse(eventData).__messageType
            console.log('messageType : '+messageType)

            chrome.extension.sendMessage({
                name: messageType,
                vmodel: eventData
            })
        })
        html.appendChild(script)
    }

    this.clearInjectedContent = function() {
        var customEvent = document.createEvent('Event'),
            eventProxyElement = this.injectedElement[1]

        customEvent.initEvent('clearInjected', true, true)
        eventProxyElement.innerText = 'clearInjectedContent'
        eventProxyElement.dispatchEvent(customEvent)
    }
    this.initialize()
})()