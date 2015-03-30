(function () {
    var model = document.getElementById('model'), // model属性列表的container
        activeElement = null, // 保存着当前查看vmodel的id的元素
        errorCount = 0, // 页面vmtree解析错误(没有获取到vmtree)次数
        foldObjectProxy = {}, // 当vmodel的属性是个对象时，每次展开都会去inspected page获取此属性对象的值，因为整个涉及到一个通信(请求数据、获取数据)的过程，因此需要在通信前保存"现场"，以便在成功获取到属性对象时能顺利获取请求数据前的“现场”信息
        port = chrome.extension.connect({name: 'avalondevtoolspanel'}), // 此连接是个与background始终保持通信状态的长连接，必须由此panel发起，因为background无法知道devtool何时打开
        bglog = function(obj) { // 为了调试avalon panel，将信息发给background来调试
            if (chrome && chrome.runtime) {
                chrome.runtime.sendMessage({
                    name: 'bglog',
                    obj: obj
                })
            }
        }

    var appVM = avalon.define('app', function(vm) {
        vm.$skipArray = ['vmid']
        vm.debugMode = false
        vm.waiting = true
        vm.tip = '<a ms-click="startDebug" href="#">hello, dear! Need debug ? yes ! click me to start debugging. Good work!</a>'
        vm.treeView = "<h2 ms-attr-vmid='node.name' ms-attr-identifier='node.identifier' ms-on-mouseenter='mouseenterCallback' ms-on-mouseleave='mouseleaveCallback' class='vname'><span ms-if='node.vmtree.size()' class='a-caret'></span>{{node.name}}</h2><ul ms-if='node.vmtree.size()'><li ms-repeat-node='node.vmtree' ms-class='leaf:!node.vmtree.size()'>{{treeView|html}}</li></ul>"
        vm.vmtree = []
        vm.vmid = ''
        // 获取VMId对应的vmodel信息，通过注入脚本改变_tmp Vmodel的identifier，在identifier的watch回调里获取页面vmodel信息通过事件发给content script再由content script将信息发给background，然后由background通过port长连接将信息发回给avalon deltool
        vm.getVMId = function(event) {
            var target = avalon(event.target),
                vmid = target.attr('vmid'),
                identifier = ''

            if (vmid && port) {
                identifier = target.attr('identifier')
                appVM.vmid = vmid
                // devtools.inspectedWindow.eval()方法用来向inspected page注入脚本
                chrome.devtools.inspectedWindow.eval('avalon.vmodels._tmp.vmid="'+ vmid +'";avalon.vmodels._tmp.identifier="'+ identifier +'"')
            }
        }
        vm.startDebug = function(event) {
            event.preventDefault()
            appVM.debugMode = true
            chrome.devtools.inspectedWindow.reload()
            port.postMessage({
                name: 'debugMode',
                debug: true
            })
        }
        // 展开或者收起VM树
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
                    activeElement = h2
                }
            }
        }
        // 根据鼠标的指引来定位对应Vmodel在inspected page上的作用范围
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


    var modelVM = avalon.define('model', function(vm) {
        // 通过在avalon devtool的对应vmodel属性上修改值来调试inspected page
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
    // 向background发出建立连接的信号
    port.postMessage({
        name: 'identification',
        data: chrome.devtools.inspectedWindow.tabId
    })

    // 监听background页面发送来的信息
    port.onMessage.addListener(function(msg) {
        bglog('background发给devtool的消息，message ：')
        bglog(msg)
        switch(msg.name) {
            case 'waiting':
                appVM.tip = '在panel中提示用户正在等待页面解析'
            break
            // case 'avalonNotInUse':
            //     appVM.tip = 'hey, man! you do not even use AVALON. Are you kidding?'
            // break
            case 'avalon':
                if (!msg.avalon) {
                    appVM.debugMode = false
                    appVM.waiting = true
                    appVM.vmtree = []
                    model.innerHTML = model.textContent = ''
                    errorCount = 0
                    appVM.tip = 'hey, man! you do not even use AVALON. Are you kidding?'
                } else {
                    appVM.tip = '<a ms-click="startDebug" href="#">hello, dear! Need debug ? yes ! click me to start debugging. Good work!</a>'
                    avalon.scan(document.body, appVM)
                }
            break
            case 'vmtree': // 页面VM tree
                errorCount = 0
                appVM.waiting = false
                appVM.vmtree = msg.pageInfo.tree
            break 
            case 'vmodel': // 获取到的vmodel的信息
                var view = modelView(msg.vmodel, true, '')
                !model && (model = document.getElementById('model'))
                model.innerHTML = view
                avalon.scan(model, modelVM)
            break
            case 'nestObj': // 获取到vmodel上对象属性的信息
                var watch = foldObjectProxy.watch,
                    name = foldObjectProxy.name,
                    $this = foldObjectProxy.$this,
                    objSignEle = foldObjectProxy.objSignEle,
                    li = foldObjectProxy.li,
                    vmodel = msg.vmodel,
                    view = modelView(vmodel, watch, name, vmodel.__arr),
                    viewFragment = avalon.parseHTML(view).firstChild

                $this.addClass('a-caret-open')
                objSignEle.addClass('hide')
                li.appendChild(viewFragment)
                avalon.scan(viewFragment, modelVM)
            break
            case 'updated': // 当inspected 页面信息解析完成或者用户通过刷新浏览器等方式更新了tab页时请求vmtree重新更新avalon devtool的面板信息
                appVM.vmtree = []
                model.innerHTML = model.textContent = ''
                if (appVM.debugMode) {
                    port.postMessage({
                        name: 'vmtree'
                    })
                }
            break
            case 'parseError':
                errorCount += 1
                if (errorCount > 5) {
                    appVM.tip = 'hey，哪里出错了, 貌似页面视图没有被avalon解析'
                } else {
                    port.postMessage({
                        name: 'vmtree'
                    })
                }
            break
            case 'stopDebug':
                appVM.debugMode = false
                appVM.waiting = true
                errorCount = 0
                appVM.vmtree = []
                model.innerHTML = model.textContent = ''
                appVM.tip = '<a ms-click="startDebug" href="#">hello, dear! Need debug ? yes ! click me to start debugging. Good work!</a>'
                avalon.scan(document.body, appVM)
            break
        }
    })
    // 生成avalon devtool页面右边的vmodel信息，通过字符串拼接的方式，不用avalon repeat避免太多的依赖监听拖慢浏览器
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
})()
