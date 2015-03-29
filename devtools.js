(function() {
    var panels = chrome.devtools.panels

    panels.elements.createSidebarPane(
        "Avalon Vmodel",
        function (sidebar) {
            panels.elements.onSelectionChanged.addListener(function updateElementProperties() {
                sidebar.setExpression("(" + getPanelContents.toString() + ")()")
            })
        }
    )

    panels.create(
        "Avalon",
        "img/angular.png",
        "panel/app.html"
    );

    // The function below is executed in the context of the inspected page.
    function getPanelContents () {
        var selectedEle = $0,
            vmodelId = ''
        
        vmodelId = selectedEle ? selectedEle.getAttribute('avalonctrl') : ''

        if (window.avalon && selectedEle && vmodelId) {
            var panelContents = {},
                vmodel = avalon.vmodels[vmodelId]
            for (prop in vmodel) {
                if (vmodel.hasOwnProperty(prop)) {
                    panelContents[prop] = vmodel[prop]
                }
            }
            return panelContents
        } else {
            return {}
        }
    } 
})()
