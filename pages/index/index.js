//index.js
//获取应用实例
import getMockData from '../../mock/stockdata'
import * as ClChart from '../../clchart/clchart'

const app = getApp()

const eventCentral = new ClChart.util.EV()

const menuTypes = {
  'MIN': 'handleMin',
  'DAY5': 'handleFiveDay',
  'DAY': 'handleKline',
  'WEEK': 'handleKline',
  'MON': 'handleKline',
  'M5': 'handleKline',
  'SEER': 'handleSeer'
}

Page({
  data: {
    canvasHeight: 300,
    canvasWidth: 300,
    pixelRatio: 1,
    typeMenusCfg: [
			{ type: 'MIN', fc: 'SH000001', label_en: '1 min(Idx)', label_zh: '分时(指数)' },
			{ type: 'DAY5', fc: 'SH000001', label_en: '5 days(Idx)', label_zh: '五日(指数)' },
			{ type: 'MIN', fc: 'SZ300545', label_en: '1 min', label_zh: '分时' },
			{ type: 'DAY5', fc: 'SZ300545', label_en: '5 days', label_zh: '五日' },
			{ type: 'DAY', fc: 'SZ300545', label_en: '1 day', label_zh: '日K' },
			{ type: 'WEEK', fc: 'SZ300545', label_en: '1 week', label_zh: '周线' },
			{ type: 'MON', fc: 'SZ300545', label_en: '1 month', label_zh: '月线' },
			{ type: 'M5', fc: 'SZ300545', label_en: '5 min', label_zh: '5分钟' },
			{ type: 'SEER', fc: 'SZ300545', label_en: 'seer(extend)', label_zh: '预测' }
    ],
    index: 0,
  },
  onReady: function (code) {
    // 获取系统信息
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          canvasHeight: res.windowHeight - 50,
          canvasWidth: res.windowWidth,
          pixelRatio: res.pixelRatio
        })
        this.initCanvas()
        this.handleMin('SZ300545')
      }
    })
  },
  bindButtonTap: function(e) {
    const value = e.detail.value
    const data = this.data.typeMenusCfg[value] || {}
    const drawFunc = menuTypes[data.type]
    if (typeof this[drawFunc] === 'function') {
      this[drawFunc](data.fc, data.type)
    }
  },
  onTouchStart: function(e) {
    eventCentral.emit('touchstart', e)
  },
  onTouchMove: function(e) {
    eventCentral.emit('touchmove', e)         
  },
  onTouchEnd: function(e) {
    eventCentral.emit('touchend', e)
  },
  initCanvas: function() {
    const deviceScale = this.data.pixelRatio
    this.layout = {
      height: this.data.canvasHeight * deviceScale,
      width: this.data.canvasWidth * deviceScale
    }
    // 定于绘图的配置，并且把mainCanvas及cursorCanvas传入做初始化
    const mainContext = wx.createCanvasContext('mainCanvas')
    const cursorContext = wx.createCanvasContext('cursorCanvas')
    this.mainContext = mainContext
    this.cursorContext = cursorContext
    mainContext._beforePaint = () => {
      mainContext.scale(1 / deviceScale, 1 / deviceScale);
    }
    mainContext._afterPaint = () => {
      mainContext.draw()
    }
    cursorContext._beforePaint = () => {
      cursorContext.scale(1 / deviceScale, 1 / deviceScale);
    }
    cursorContext._afterPaint = () => {
      cursorContext.draw()
    }

    const syscfg = {
      scale: deviceScale,
      axisPlatform: 'phone', // 'phone' | 'web'
      eventPlatform: 'mina',
      mainCanvas: {
        canvas: eventCentral,
        context: mainContext
      },
      cursorCanvas: {
        canvas: eventCentral,
        context: cursorContext
      }
    }
    // 创建单一股票Chart实例
    this.Chart = ClChart.createSingleChart(syscfg)

    const __mainOnPaint = this.Chart.onPaint.bind(this.Chart)
    this.Chart.onPaint = function(art) {
      __mainOnPaint.call()
    }
  },
  handleMin: function(code) {
    // 清除画布，及数据
    this.Chart.clear()
    // 初始化数据
    this.Chart.initData(20180413, ClChart.DEF_DATA.STOCK_TRADETIME)
    // 设置相应的数据
    this.Chart.setData('INFO', ClChart.DEF_DATA.FIELD_INFO, getMockData(code, 'INFO'))
    this.Chart.setData('MIN', ClChart.DEF_DATA.FIELD_MIN, getMockData(code, 'MIN'))
    this.Chart.setData('TICK', ClChart.DEF_DATA.FIELD_TICK, getMockData(code, 'TICK'))
    this.Chart.setData('NOW', ClChart.DEF_DATA.FIELD_NOW, getMockData(code, 'NOW'))
    // 设置画布尺寸
    let mainHeight = this.layout.height * 2 / 3
    let mainWidth = Math.max(this.layout.width * 0.65, this.layout.width - 400)
    if (code === 'SH000001') mainWidth = this.layout.width
    // 设置画布区域布局
    const mainLayoutCfg = {
      layout: ClChart.DEF_CHART.CHART_LAYOUT,
      config: ClChart.DEF_CHART.CHART_NOW,
      rectMain: {
        left: 0,
        top: 0,
        width: mainWidth,
        height: mainHeight
      }
    }
    const mainChart = this.Chart.createChart('MIN', 'CHART.LINE', mainLayoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(mainChart, 'MIN')

    const volumeLoyoutCfg = {
      layout: ClChart.DEF_CHART.CHART_LAYOUT,
      config: ClChart.DEF_CHART.CHART_NOWVOL,
      rectMain: {
        left: 0,
        top: mainHeight,
        width: mainWidth,
        height: this.layout.height - mainHeight
      }
    }
    const volumeChart = this.Chart.createChart('MINNOW', 'CHART.LINE', volumeLoyoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(volumeChart, 'MIN')

    if (code !== 'SH000001') {
      const orderLayoutCfg = {
        layout: ClChart.DEF_CHART.CHART_LAYOUT,
        config: ClChart.DEF_CHART.CHART_ORDER,
        rectMain: {
          left: mainWidth,
          top: 0,
          width: this.layout.width - mainWidth,
          height: this.layout.height
        }
      }
      const orderChart = this.Chart.createChart('ORDER', 'CHART.ORDER', orderLayoutCfg, function (result) {
        //  console.log(result)
      })
      // this.Chart.bindData(orderChart, 'TICK')
    }

    this.Chart.onPaint()
  },
  	// 画五日线
  handleFiveDay: function (code) {
    console.log('Five Day Line')
    this.Chart.clear()
    this.Chart.initData(20180413, ClChart.DEF_DATA.STOCK_TRADETIME)
    this.Chart.setData('INFO', ClChart.DEF_DATA.FIELD_INFO, getMockData(code, 'INFO'))
    this.Chart.setData('DAY5', ClChart.DEF_DATA.FIELD_DAY5, getMockData(code, 'DAY5'))
    this.Chart.setData('MIN', ClChart.DEF_DATA.FIELD_MIN, getMockData(code, 'MIN'))
    const mainHeight = this.layout.height * 2 / 3
    const mainLayoutCfg = {
      layout: ClChart.DEF_CHART.CHART_LAYOUT,
      config: ClChart.DEF_CHART.CHART_DAY5,
      rectMain: {
        left: 0,
        top: 0,
        width: this.layout.width,
        height: mainHeight
      }
    }
    const KBarChart = this.Chart.createChart('DAY5', 'CHART.LINE', mainLayoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(KBarChart, 'DAY5')

    const volumeLoyoutCfg = {
      layout: ClChart.DEF_CHART.CHART_LAYOUT,
      config: ClChart.DEF_CHART.CHART_DAY5VOL,
      rectMain: {
        left: 0,
        top: mainHeight,
        width: this.layout.width,
        height: this.layout.height - mainHeight
      }
    }
    const KVBarChart = this.Chart.createChart('VLINE5', 'CHART.LINE', volumeLoyoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(KVBarChart, 'DAY5')

    this.Chart.onPaint()
  },
		// 画日线
  handleKline: function (code, peroid) {
    let source = peroid
    if (peroid === 'WEEK' || peroid === 'MON') source = 'DAY'
    this.Chart.clear()
    this.Chart.initData(20180413, ClChart.DEF_DATA.STOCK_TRADETIME)
    this.Chart.setData('INFO', ClChart.DEF_DATA.FIELD_INFO, getMockData(code, 'INFO'))
    this.Chart.setData('RIGHT', ClChart.DEF_DATA.FIELD_RIGHT, getMockData(code, 'RIGHT'))
    this.Chart.setData(source, ClChart.DEF_DATA.FIELD_DAY, getMockData(code, source))
    const mainHeight = this.layout.height * 2 / 3
    const mainLayoutCfg = {
      layout: {
        offset: {
          left: 5,
          right: 10
        }
      },
      buttons: ClChart.DEF_CHART.CHART_BUTTONS,
      config: ClChart.DEF_CHART.CHART_KBAR,
      rectMain: {
        left: 0,
        top: 0,
        width: this.layout.width,
        height: mainHeight
      }
    }
    const KBarChart = this.Chart.createChart('KBAR', 'CHART.LINE', mainLayoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(KBarChart, peroid)

    const volumeLoyoutCfg = {
      layout: {
        offset: {
          left: 5,
          right: 10
        }
      },
      config: ClChart.DEF_CHART.CHART_VBAR,
      rectMain: {
        left: 0,
        top: mainHeight,
        width: this.layout.width,
        height: this.layout.height - mainHeight
      }
    }
    const KVBarChart = this.Chart.createChart('VBAR', 'CHART.LINE', volumeLoyoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(KVBarChart, peroid)

    this.Chart.onPaint()
  },
  handleSeer: function() {
    this.Chart.clear()
    this.Chart.initData(20180413, ClChart.DEF_DATA.STOCK_TRADETIME)
    this.Chart.setData('INFO', ClChart.DEF_DATA.FIELD_INFO, getMockData('SZ300545', 'INFO'))
    this.Chart.setData('RIGHT', ClChart.DEF_DATA.FIELD_RIGHT, getMockData('SZ300545', 'RIGHT'))
    this.Chart.setData('DAY', ClChart.DEF_DATA.FIELD_DAY, getMockData('SZ300545', 'DAY'))
    this.Chart.setData('SEER', ClChart.PLUGINS.FIELD_SEER, getMockData('SZ300545', 'SEER'))
    this.Chart.setData('SEERHOT', {}, ['15'])
    const mainHeight = this.layout.height * 2 / 3
    const mainLayoutCfg = {
      layout: {
        offset: {
          left: 5,
          right: 100,
          top: 20,
          bottom: 20
        }
      },
      buttons: [ { key: 'zoomin' }, { key: 'zoomout' } ],
      config: ClChart.PLUGINS.CHART_SEER,
      rectMain: {
        left: 0,
        top: 0,
        width: this.layout.width,
        height: mainHeight
      }
    }
    const KBarChart = this.Chart.createChart('SEER', 'CHART.LINE', mainLayoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(KBarChart, 'DAY')

    const volumeLayoutCfg = {
      layout: {
        offset: {
          left: 5,
          right: 100,
          top: 20,
          bottom: 20
        }
      },
      config: ClChart.DEF_CHART.CHART_VBAR,
      rectMain: {
        left: 0,
        top: mainHeight,
        width: this.layout.width,
        height: this.layout.height - mainHeight
      }
    }
    const KVBarChart = this.Chart.createChart('VBAR', 'CHART.LINE', volumeLayoutCfg, function (result) {
      //  console.log(result)
    })
    this.Chart.bindData(KVBarChart, 'DAY')

    this.Chart.onPaint()
  }
})
