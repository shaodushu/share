import Taro, { Component } from '@tarojs/taro'
import { View} from '@tarojs/components'
import './canvasdrawer.scss'
interface Props {
    painting: any;
    getImage: any;
}
interface State {
    showCanvas: boolean;
    width: number;
    height: number;
    index: number;
    imageList: Array<any>;
    tempFileList: Array<any>;
    isPainting: boolean;
}
//triggerEvent
export default class CanvasDrawer extends Component<Props, State> {
    constructor() {
        super()
        this.state = {
            showCanvas: false,
            width: 100,
            height: 100,
            index: 0,
            imageList: [],
            tempFileList: [],
            isPainting: false,
        }
    }
    ctx: any
    cache: {}
    componentWillMount() {
        console.log('页面开始载入....')
    }
    componentDidMount() {
        console.log('页面渲染完成....')
        Taro.removeStorageSync('canvasdrawer_pic_cache')
        this.cache = Taro.getStorageSync('canvasdrawer_pic_cache') || {}
        this.ctx = Taro.createCanvasContext('canvasdrawer', this)
    }
    componentWillReceiveProps(nextProps) {
        console.log('Props值发生变化....')
        try {
            const { width, height, views } = nextProps.painting
            if (!this.state.isPainting) {
                if (width && height) {
                    this.setState({
                        showCanvas: true,
                        isPainting: true,
                        width,
                        height
                    })
                    const inter = setInterval(() => {
                        if (this.ctx) {
                            clearInterval(inter)
                            this.getImageList(views).then(()=>{
                                this.downLoadImages(0)
                            })
                        }
                    }, 100)
                }
            } else {
                console.log('%c isPainting is true', 'color:#ff9900;')
            }
        } catch (error) {
            console.log(error)
        }
    }
    getImageList(views: Array<any>) {
        return new Promise((resolve, reject) => {
            console.log('图片信息存入队列....')
            try {
                const imageList = []
                for (let i = 0; i < views.length; i++) {
                    if (views[i].type === 'image') {
                        imageList.push(views[i].url)
                    }
                }
                this.setState({
                    imageList: imageList
                },()=>{
                    resolve()
                })
            } catch (error) {
                reject(error)
            }
        })
    }
    downLoadImages(index) {
        console.log('下载图片....')
        const { imageList, tempFileList } = this.state
        if (index < imageList.length) {
            this.getImageInfo(imageList[index]).then(file => {
                tempFileList.push(file)
                this.setState({
                    tempFileList
                })
                this.downLoadImages(index + 1)
            })
        } else {
            this.startPainting()
        }
    }
    startPainting() {
        console.log('开始绘制....')
        const { painting: { views } } = this.props
        const { tempFileList } = this.state
        for (let i = 0, imageIndex = 0; i < views.length; i++) {
            if (views[i].type === 'image') {
                this.drawImage({
                    ...views[i],
                    url: tempFileList[imageIndex]
                })
                imageIndex++
            } else if (views[i].type === 'text') {
                if (!this.ctx.measureText) {
                    Taro.showModal({
                        title: '提示',
                        content: '当前微信版本过低，无法使用 measureText 功能，请升级到最新微信版本后重试。'
                    })
                } else {
                    this.drawText(views[i])
                }
            } else if (views[i].type === 'rect') {
                this.drawRect(views[i])
            }
        }    
        this.ctx.draw(true, () => {
            console.log('%c 绘制完毕...', 'color:#19be6b;')
            Taro.setStorageSync('canvasdrawer_pic_cache', this.cache)
            this.saveImageToLocal()
        })
    }
    drawImage(params) {
        console.log('绘制图片....')
        const { url, top = 0, left = 0, width = 0, height = 0 } = params
        this.ctx.drawImage(url, left, top, width, height)
    }
    drawText(params) {
        console.log('绘制文本...')
        const {
            MaxLineNumber = 2,
            breakWord = false,
            color = 'black',
            content = '',
            fontSize = 16,
            top = 0,
            left = 0,
            lineHeight = 20,
            textAlign = 'left',
            width,
            bolder = false,
            textDecoration = 'none'
        } = params

        this.ctx.setTextBaseline('top')
        this.ctx.setTextAlign(textAlign)
        this.ctx.setFillStyle(color)
        this.ctx.setFontSize(fontSize)

        if (!breakWord) {
            this.ctx.fillText(content, left, top)
            this.drawTextLine(left, top, textDecoration, color, fontSize, content)
        } else {
            let fillText = ''
            let fillTop = top
            let lineNum = 1
            for (let i = 0; i < content.length; i++) {
                fillText += [content[i]]
                if (this.ctx.measureText(fillText).width > width) {
                    if (lineNum === MaxLineNumber) {
                        if (i !== content.length) {
                            fillText = fillText.substring(0, fillText.length - 1) + '...'
                            this.ctx.fillText(fillText, left, fillTop)
                            this.drawTextLine(left, fillTop, textDecoration, color, fontSize, fillText)
                            fillText = ''
                            break
                        }
                    }
                    this.ctx.fillText(fillText, left, fillTop)
                    this.drawTextLine(left, fillTop, textDecoration, color, fontSize, fillText)
                    fillText = ''
                    fillTop += lineHeight
                    lineNum++
                }
            }
            this.ctx.fillText(fillText, left, fillTop)
            this.drawTextLine(left, fillTop, textDecoration, color, fontSize, fillText)
        }

        if (bolder) {
            this.drawText({
                ...params,
                left: left + 0.3,
                top: top + 0.3,
                bolder: false,
                textDecoration: 'none'
            })
        }
    }
    drawTextLine(left, top, textDecoration, color, fontSize, content) {
        if (textDecoration === 'underline') {
            this.drawRect({
                background: color,
                top: top + fontSize * 1.2,
                left: left - 1,
                width: this.ctx.measureText(content).width + 3,
                height: 1
            })
        } else if (textDecoration === 'line-through') {
            this.drawRect({
                background: color,
                top: top + fontSize * 0.6,
                left: left - 1,
                width: this.ctx.measureText(content).width + 3,
                height: 1
            })
        }
    }
    drawRect(params) {
        console.log('绘制边框...')
        const { background, top = 0, left = 0, width = 0, height = 0 } = params
        this.ctx.setFillStyle(background)
        this.ctx.fillRect(left, top, width, height)
    }
    getImageInfo(url) {
        console.log('获取图片信息....')
        return new Promise((resolve, reject) => {
            /* 获得要在画布上绘制的图片 */
            if (this.cache[url]) {
                resolve(this.cache[url])
            } else {
                const objExp = new RegExp(/^http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/)
                if (objExp.test(url)) {
                    Taro.getImageInfo({
                        src: url,
                    }).then((res:any) => {
                        if (res.errMsg === 'getImageInfo:ok') {
                            this.cache[url] = res.path
                            resolve(res.path)
                        } else {
                            reject(new Error('getImageInfo fail'))
                        }
                    })
                } else {
                    this.cache[url] = url
                    resolve(url)
                }
            }
        })
    }
    saveImageToLocal() {
        console.log('保存图片路径...')
        const { width, height } = this.state
        const { getImage } = this.props

        Taro.canvasToTempFilePath({
            x: 0,
            y: 0,
            width,
            height,
            canvasId: 'canvasdrawer',
            success: res => {
                Taro.hideLoading()
                if (res.errMsg === 'canvasToTempFilePath:ok') {
                    this.setState({
                        showCanvas: false,
                        isPainting: false,
                        imageList: [],
                        tempFileList: []
                    })
                    getImage({ tempFilePath: res.tempFilePath })
                }
            }
        })
    }
    render() {
        const { width, height, showCanvas } = this.state;
        let canvasStyle = {
            width: width + 'px',
            height: height + 'px'
        }
        return (
            <View>
                {
                    showCanvas ? <canvas canvas-id="canvasdrawer" className="board" style={canvasStyle} /> : null
                }
            </View>

        )
    }
}
