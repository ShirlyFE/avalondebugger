var model = document.getElementById('model')
var activeElement = null
var appVM = avalon.define('app', function(vm) {
    vm.$skipArray = ['vmid']
    vm.treeView = "<h2 ms-attr-vmid='node.name' ms-attr-identifier='node.identifier' ms-on-mouseenter='mouseenterCallback' ms-on-mouseleave='mouseleaveCallback' class='vname'><span ms-if='node.vmtree.size()' class='a-caret'></span>{{node.name}}</h2><ul ms-if='node.vmtree.size()'><li ms-repeat-node='node.vmtree' ms-class='leaf:!node.vmtree.size()'>{{treeView|html}}</li></ul>"
    vm.vmtree = []
    vm.vmid = ''
    vm.getVMId = function(event) {
        var target = avalon(event.target),
            vmid = target.attr('vmid'),
            identifier = ''

        if (vmid && port) {
            bglog('vmid ' + vmid)
            identifier = target.attr('identifier')
            appVM.vmid = vmid
            chrome.devtools.inspectedWindow.eval('avalon.vmodels._tmp.vmid="'+ vmid +'";avalon.vmodels._tmp.identifier="'+ identifier +'"')
        }
    }
    vm.renderedCallback = function() {
        bglog(this.innerHTML)
    }
    vm.toggleCollapse = function(event) {
        var target = event.target,
            h2 = null,
            ul = null,
            li = null

        if (target.className.indexOf('a-caret') !== -1) {
            h2 = target.parentNode
            if (h2.tagName.toLowerCase() === 'h2') {
                avalon(h2).toggleClass('a-collapse')
                li = h2.parentNode
                avalon(li).toggleClass('a-li-collapse')
                ul = h2.nextElementSibling
                if (ul) {
                    if (ul.style.display !== 'none') {
                        ul.style.display = 'none'
                    } else {
                        ul.style.display = ''
                    }
                }
            }
        }
        if (target.tagName.toLowerCase() === 'h2') {
            h2 = avalon(target)
            if (activeElement != h2) {
                activeElement && activeElement.removeClass('a-active')
                h2.addClass('a-active')
                bglog('ul innerHTML is :')
                bglog(this.innerHTML)
                activeElement = h2
            }
        }
    }
    vm.mouseenterCallback = function() {
        var target = avalon(this),
            vmid = target.attr('vmid'),
            identifier = target.attr('identifier')

        if (port) {
            chrome.devtools.inspectedWindow.eval('avalon.vmodels._tmp.mouseoverid="'+ vmid +'";avalon.vmodels._tmp.mouseoverIdentifition="'+ identifier +'"')
        }
    }
    vm.mouseleaveCallback = function() {
        chrome.devtools.inspectedWindow.eval('avalon.vmodels._tmp.mouseoverid="";avalon.vmodels._tmp.mouseoverIdentifition=""')
    }
})
var foldObjectProxy = {}

var modelVM = avalon.define('model', function(vm) {
    vm.changeCallback = function () {
        var name = this.getAttribute('name'),
            value = this.value,
            index = this.getAttribute('index'), // 如果元素没有index属性返回null
            proType = this.getAttribute('proType'),
            vmodel = 'avalon.vmodels["' + appVM.vmid + '"]',
            evalStr = '',
            evalValue = ''

        vmodel += ' && (' + vmodel

        switch (proType) {
            case 'string':
                evalValue = index != void 0 ? '.set(' + index + ',"' + value + '"))' : '="' + value + '")'
            break
            case 'number':
            case 'boolean':
                evalValue = index != void 0 ? '.set(' + index + ',' + value + '))' : '=' + value + ')'
            break
        }
        evalStr = vmodel + name + evalValue
        chrome.devtools.inspectedWindow.eval(evalStr)
        this.blur()
    }
    vm.focusCallback = function() {
        var value = this.value
        if (value === "''") {
            this.value = ''
        }
    }
    vm.foldObject = function(watch) {
        var $this = avalon(this),
            li = this.parentNode,
            name = li.getAttribute('name'),
            className = this.className,
            objSignEle = avalon(this.nextSibling.nextSibling)

        if (className.indexOf('a-caret-open') !== -1) {
            var ulChild = li.getElementsByTagName('ul')[0]
            $this.removeClass('a-caret-open')
            objSignEle.removeClass('hide')
            if (ulChild) {
                ulChild.innerHTML = ulChild.textContent = ''
                li.removeChild(ulChild)
            }
        } else {
            chrome.devtools.inspectedWindow.eval('avalon.vmodels._tmp.name="'+ name +'"; avalon.vmodels._tmp.name="";')
            foldObjectProxy = {
                watch: watch,
                li: li,
                name: name,
                $this: $this,
                objSignEle: objSignEle
            }
        }
    }
})


function modelView(model, objWatch, name, arr) {
    var view = '<ul>'
    for (var pro in model) {
        var proObj = model[pro],
            proType = proObj.type,
            proVal = proObj.val,
            watch = !objWatch ? false : proObj.watch,
            labelStr = '<span class="label' + (watch ? '">': ' unwatch">') +  pro + ':</span>',
            _name = name + "['" + pro + "']",
            inputName = arr ? name : _name,
            inputStr = '',
            classType = ''

        if (proType === 'string' && !proVal) {
            proVal = "''"
        }
        inputStr = watch ? '<input type="text" proType="' + proType + '" value="' + proVal + '" name="' + inputName + '" ' + (arr ? 'index=' + pro : '')+ ' ms-on-change="changeCallback" ms-on-focus="focusCallback"/>' : proVal
        if (model.hasOwnProperty(pro)) {
            switch(proType) {
                case 'string':
                    if (proObj.elementObj) {
                        classType = 'a-object'
                    } else {
                        classType = 'a-string'
                    }
                    view += '<li class="' + classType + '">' + labelStr + '<span class="value">' + inputStr + '</span>'
                break
                case 'function':
                    view += '<li class="a-function">' + labelStr + '<span>' + proVal + '</span>'
                break
                case 'number':
                    view += '<li class="a-number">' + labelStr + '<span class="value">' + inputStr + '</span>'
                break
                case 'boolean':
                    view += '<li class="a-boolean">' + labelStr + '<span class="value">' + inputStr + '</span>'
                break
                case 'array':
                    classType = 'a-array'
                case 'object':
                    classType = classType ? classType : 'a-object'
                    view += '<li class="' + classType + '" name="' + _name + '"><span class="a-caret" ms-click="foldObject(' + watch + ')"></span>' + labelStr + '<span>' + proVal + '</span>'
                break
                case 'undefined':
                    classType = 'a-undefined'
                case 'null':
                    classType = classType ? classType : 'a-null'
                    view += '<li class="' + classType + '">' + labelStr + '<span class="value">' + proVal + '</span>'
                break
            }
        }
        view += '</li>'
    }
    view += '</ul>'
    return view
}

// 为了调试avalon panel，将信息发给background来调试
var bglog = function(obj) {
    if (chrome && chrome.runtime) {
        chrome.runtime.sendMessage({
            name: 'bglog',
            obj: obj
        })
    }
}

// 用来注入脚本
// devtools.inspectedWindow.eval()

var port = chrome.extension.connect({name: 'avalondevtoolspanel'})
port.postMessage({
    name: 'identification',
    data: chrome.devtools.inspectedWindow.tabId
})

port.postMessage({
    name: 'vmtree'
})

port.onMessage.addListener(function(msg) {
    bglog('msg :')
    bglog(msg)
    switch(msg.name) {
        case 'waiting':
            console.log('在panel中提示用户正在等待页面解析')
        break
        case 'vmtree':
            appVM.vmtree = msg.pageInfo.tree
        break
        case 'vmodel':
            model.innerHTML = modelView(JSON.parse(msg.vmodel), true, '')
            avalon.scan(model, modelVM)
        break
        case 'nestObj':
            var watch = foldObjectProxy.watch,
                name = foldObjectProxy.name,
                $this = foldObjectProxy.$this,
                objSignEle = foldObjectProxy.objSignEle,
                li = foldObjectProxy.li,
                vmodel = JSON.parse(msg.vmodel),
                view = modelView(vmodel, watch, name, vmodel.__arr),
                viewFragment = avalon.parseHTML(view).firstChild

            $this.addClass('a-caret-open')
            objSignEle.addClass('hide')
            li.appendChild(viewFragment)
            avalon.scan(viewFragment, modelVM)
        break
        case 'ready':
        case 'updated':
            appVM.vmtree = []
            model.innerHTML = model.textContent = ''
            port.postMessage({
                name: 'vmtree'
            })
        break
    }
})
