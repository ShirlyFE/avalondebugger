(function() {
    var controllerEles = getControllerEles(),
        mask = createMaskElement(),
        eventProxyElement = document.getElementById('__avalonVmodelElement'),
        customEvent = document.createEvent('Event')

    customEvent.initEvent('avalonVmodel', true, true)
    // 当开发控制台关闭时需要清掉开发者工具注入的dom和js，过程是：background监听avalon devtool的disconnect连接状态，发现连接断开则向content script发消息通知，content script再通过eventProxyElement发送clearInjected消息，在hint.jsZ中接收此clearInjected消息清除注入的mask，删掉vmodel _tmp然后告诉content script清理完成，由content script完成剩下的清理工作
    eventProxyElement.addEventListener('clearInjected', function () {
        mask.parentNode.removeChild(mask)
        delete avalon.vmodels._tmp
        sendMessage(true, 'clearOk')
    })
    // eventProxyElement.addEventListener('avalon', function () {
    //     avalonUseJudge('avalonAgain')
    // })

    if (!avalonUseJudge('avalon')) return false
    
    function avalonUseJudge(type) {
        try {
            if (avalon && avalon.version && avalon.bindingExecutors && avalon.bindingHandlers) {
                sendMessage(true, type)
                injectAvalonCode()
                return true
            }
        } catch(e) {
            sendMessage(false, type)
            return false
        }
    }

    function injectAvalonCode() {
        var __VM = avalon.define('_tmp', function(vm) {
            vm.$skipArray = ['mouseoverid', 'vmid']
            vm.vmid = ''
            vm.name = ''
            vm.identifier = ''
            vm.mouseoverid = ''
            vm.mouseoverIdentifition = ''
        })
        
        __VM.$watch('identifier', function(identifier) {
            if (!identifier) return
            var vmId = __VM.vmid,
                parseVmodel = displayObj(avalon.vmodels[vmId])
            sendMessage(parseVmodel, 'vmodel')
            __VM.identifier = ''
        })
        __VM.$watch('name', function(name) {
            if (!name) return
            var vmodel = avalon.vmodels[__VM.vmid],
                vmObj = eval('vmodel' + name),
                parseVmodel = displayObj(vmObj),
                arr = avalon.type(vmObj) === 'array'
            parseVmodel.__arr = arr
            sendMessage(parseVmodel, 'nestObj')
        })
        __VM.$watch('mouseoverIdentifition', function(mouseoverIdentifition) {
            var vmId = __VM.mouseoverid
            if (!mouseoverIdentifition) {
                mask.style.cssText = 'display: none;'
            } else {
                setMaskPosition(vmId, mouseoverIdentifition)
            }
        })
        avalon.scan(eventProxyElement, __VM)
    }
    

    function displayObj (vmObj) {
        var obj = vmObj.$model ? vmObj.$model : vmObj,
            displayObj = {},
            funcReg = /^(function\s*[a-zA-Z0-9_]*\([a-zA-Z0-9_var,\s]*\))\s*\{/

        for (var i in obj) {
            var item = obj[i],
                type = avalon.type(item),
                watch = !(i.charAt(0) === '$' || (vmObj.$skipArray && vmObj.$skipArray.indexOf(i) !== -1 ? true: false)),
                displayObjI = {},
                elementObj = false

            if (item && item.ELEMENT_NODE && item.DOCUMENT_NODE) {
                elementObj = true
                type = 'string'
                watch = false
                item = Object.prototype.toString.call(item)
            }

            displayObj[i] = displayObjI = {
                watch: watch,
                val: item,
                type: type
            }
            elementObj && (displayObjI.elementObj = true)

            switch(type) {
                case 'function':
                    displayObjI.val = funcReg.exec(item)[0] + '...}'
                break
                case 'array':
                    displayObjI.val = '[...]'
                break
                case 'object':
                    displayObjI.val = '{...}'
                break
                case 'string':
                    displayObjI.val = avalon.filters.escape(item)
            }
        }
        return displayObj
    }
    function sendMessage (message, messageType) {
        eventProxyElement.innerText = JSON.stringify({name: messageType, val: message})  //自定义事件是可以添加自定义数据的，只是要求数据是字符串，所以这里也可以将数据附在customEvent上
        eventProxyElement.dispatchEvent(customEvent)
    }
    function getControllerEles() {
        var elements = document.getElementsByTagName('*'),
            avalonElements = []

        for (var i = 0, len = elements.length; i < len; i++) {
            var element = elements[i],
                vmodel = element.getAttribute('avalonctrl')

            if (vmodel) {
                avalonElements.push(element)
            }
        }
        return avalonElements
    }
    function createMaskElement() {
        var html = document.getElementsByTagName('html')[0];
        var maskElement = document.createElement('div')
        maskElement.style.display = 'none'
        html.appendChild(maskElement)
        return maskElement
    }
    function setMaskPosition(name, identifier) {
        for (var i = 0, len = controllerEles.length; i < len; i++) {
            var controllerEle = controllerEles[i]
            if (controllerEle.getAttribute('avalonctrl') === name && controllerEle.getAttribute('identifier') === identifier) {
                setCss(controllerEle, mask)
            }
        }
    }
    function setCss(element, mask) {
        var width = element.offsetWidth,
            height = element.offsetHeight,
            offset = avalon(element).offset(),
            offsetLeft = offset.left,
            offsetTop = offset.top

        mask.style.cssText = 'display: block; width: ' + width + 'px;height: ' + height + 'px;left: ' + offsetLeft + 'px; top:' + offsetTop + 'px; background: rgba(244, 68, 168, 0.2);position:absolute;'
    }
})()
