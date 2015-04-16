# avalon debugger

> 基于chrome的扩展工具，用来直观的查看页面VM的嵌套关系，方便的进行avalon的调试

![avalon logo](./img/webstore-icon.png "avalon logo")

## 安装

从github上下载[avalon debugger](https://github.com/shirlyLoveU/avalondebugger/archive/master.zip)解压

打开chrome浏览器，地址栏输入：**chrome://extensions**打开chrome的扩展程序

勾选右上角的**开发者模式**

将解压的avalon debugger目录文件拖放到扩展程序页即完成了安装

![avalon install screenshots](./img/screenshots/avalonInstall.png "avalon install screenshots")

## 使用

成功安装avalon debugger之后，打开一个使用avalon的页面，**F12**打开chrome的调试控制台找到Avalon

![avalon debugger tab](./img/screenshots/avalonDebugger.png "avalon debugger tab")

切换到Avalon panel，提示我们开启avalon调试，点击链接开启avalon调试功能

![avalon panel](./img/screenshots/avalonPanel.png "avalon panel")

开启调试之后会将页面上的VM controller按其嵌套关系展现在Avalon panel中的VM tree区域，可以展开、收起嵌套较深的VM

**注:** 每个VM面板的header部分代表对应VM的id，可以通过avalon.vmodels[id]获取对应的Vmodel 

![avalon VM tree](./img/screenshots/avalonVMTree.png "avalon VM tree")

鼠标悬停在对应的VM上时页面上会标出其作用的DOM范围

![avalon VM scope](./img/screenshots/avalonVMScope.png "avalon VM scope")

点击对应的VM会在Avalon panel右侧的vmodel区域展示对应VM具有的数据结构，其中不可监控的数据属性用删除线标志，可监控的number、boolean、string类型属性可直接调试，且不同的数据类型通过不同的color和icon标志

以test vmodel为例，test的定义如下：

```javascript
  avalon.define('test', function(vm) {
    vm.name = 'test controller'
    vm.age = 5,
    vm.$job = 'js'
    vm.$skipArray = ['defaultSalary']
    vm.defaultSalary = 3000
    vm.salary = 3000
    vm.generateVMtree = function() {
        console.log('this : ')
        console.log(this)
        alert("当前页面使用的vmodels : " + Object.keys(avalon.vmodels))
    }
    vm.setSalary = function(salary) {
        testVM.salary = salary
    }
  })
```

可见其中**$job**和**defaultSalary**是不可监控属性：

![unwatch property](./img/screenshots/unwatchProperty.png "unwatch property")

对于可监控的age、name、salary我们都可以直接调试, 以age为例：

![watch enabled property](./img/screenshots/watchPropDebugger.png "watch enabled property")

输入需要的值回车之后，age自动更新:

![watch enabled property debugger result](./img/screenshots/watchPropDebugResult.png "watch enabled property debugger result")

如果需要调用VM的方法进行调试，可以点击对应的**function name**，就可以在console控制台下看到对应方法的实现，并且该方法可在console控制台下通过**$f**引用，执行$f()即执行对应的方法

以上面定义的test VM的setSalary方法为例，点击setSalary后console控制台的显示如下：

![function debugger](./img/screenshots/funcDebug.png "function debugger")

调用**$f**方法，同时传入5000来修改salary，并查看页面salary的变化

![function debugger result](./img/screenshots/funcDebuggerResult.png "function debugger result")

如果不确定Avalon panel中vmodel展示的信息是否正确，可以根据VM tree区域展示的VM id手动在console控制台调用avalon.vmodels[id]来查看VM

### 最后的说明

如果程序内容修改了VM的属性或者页面上的操作(绑定ms
-duplex)更新了VM的属性,Avalon panel中vmodel区域展示的内容可能**过旧**，这时只需要重新VM tree区域对应的VM即可得到更新后的数据

