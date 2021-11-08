// ==UserScript==
// @name        PikPak保存助手
// @version     1.0.0
// @namespace   PikPak-expand
// @icon        https://mypikpak.com/logo.png
// @author      mumuchenchen
// @description 支持监听磁力链接直接保存 支持监听粘贴磁力链接到页面保存 支持选中磁力链接后选择添加
// @match       *://*/*
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_registerMenuCommand
// @grant       GM_unregisterMenuCommand
// @version     1.0
// @author      -
// @description 2021/11/8 上午11:21:48
// ==/UserScript==

(function () {
    'use strict';
    const magnetRegx = /^(magnet:\?xt=urn:btih:)[0-9a-fA-F]{40}.*$/
    const initPage = () => {
        // 添加选中
        document.addEventListener('mouseup', (e) => {
            if(e && e.target.closest('#pikpak-expand-share')) {
                e.preventDefault();
                return false
            }
            if(getPikpakUrl()) {
                showPikPak(e.pageX, e.pageY)
            } else {
                hidePikPak(e)
            }
        })
        // 添加粘贴
        document.addEventListener('paste', (e) => {
            const text = e.clipboardData.getData('text/plain');
            if(testUrl(text)) {
                postUrlArray(text)
            }
        })
        // 添加链接跳转建通
        document.body.addEventListener('click', (e) => {
            if(e.target.href && testUrl(e.target.href)) {
                e.preventDefault()
                postUrl(e.target.href)
            }
        })
        // 添加登录或登出菜单
        const pikpakLogin = JSON.parse(GM_getValue('pikpakLoginInfo', '{}'))
        if(pikpakLogin.access_token && pikpakLogin.expires > new Date().getTime()) {
            GM_registerMenuCommand('登出',() => {
                logout()
            })
        } else {
            GM_deleteValue('pikpakLoginInfo')
            GM_registerMenuCommand('登陆',() => {
                login({})
                    .then(res => {
                        console.log(res)
                        alertMsg('登录成功')
                    })
            })
        }
        if(!GM_getValue('pikpakHelpShow', '')) {
            showHelp()
        }
    }
    /**
     * 验证链接
     * @params url 
     */
    const testUrl = (url) => {
        return magnetRegx.test(url) || url.indexOf('PikPak://') !== -1
    }
    /**
     * 获取选中文本内磁力信息
     */
    const getPikpakUrl = () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        if(testUrl(selectedText)) {
            return selectedText
        }
        return ''
    }
    const handlePikpakClick = (e) => {
        e.preventDefault();
        postUrlArray(getPikpakUrl())
        hidePikPak()
    }
    /** 
     * 显示帮助信息
     */
    const showHelp = () => {
        return new Promise((resolve, reject) => {
            const html = `
                <div class="pikpak-alert-help" style="z-index: 6000; position: fixed; display: flex; align-items: center; flex-direction: column;top: 50%;left: 50%; text-align: center;  transform: translate(-50%, -50%);">
                    <div class="pikpak-alert-login-box" style="align-items: center;background-color: #fff;box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05);color: rgb(51, 54, 57);padding: 20px;border-radius: 3px;">
                        <div class="" style="margin-bottom: 10px;">
                            <h2>安装成功Pikpak油猴插件提示</h2>
                        </div>
                        <h3>支持监听磁力链接直接保存</h3>
                        <h3>支持监听粘贴磁力链接到页面保存</h3>
                        <h3>支持选中磁力链接后选择添加</h3>
                        
                        <div class="">
                            <button id="pikpak-alert-help-confirm" style="border: 1px solid #ddd; background-color: #428BCA; color: #fff; border-radius: 3px; padding: 6px 20px; margin-right: 10px;">确定</button>
                        <div>
                    </div>
                </div>
            `
            const maskHtml = `
                <div class="pikpak-alert-mask" style="position: fixed; left: 0; right: 0; top: 0; bottom: 0; background-color: rgba(0, 0, 0, .4);"></div>
            `
            document.body.insertAdjacentHTML('beforeend', html);
            document.body.insertAdjacentHTML('beforeend', maskHtml);
            const pikpakConfirm = document.querySelector('#pikpak-alert-help-confirm');
            pikpakConfirm.addEventListener('click', () => {
                document.querySelector('.pikpak-alert-help').remove()
                document.querySelector('.pikpak-alert-mask').remove()
                GM_setValue('pikpakHelpShow', 1)
                resolve()
            })
            document.querySelector('.pikpak-alert-mask').addEventListener('click', (e) => {
                if(e.target.closest('.pikpak-alert-help')) {
                    return false
                } else {
                    document.querySelector('.pikpak-alert-help').remove()
                    document.querySelector('.pikpak-alert-mask').remove()
                    GM_setValue('pikpakHelpShow', 1)
                    resolve()
                }
            })
        })
    }
    /**
     * 显示pikpak
     * @param x
     * @param y
    **/
    const showPikPak = (x, y) => {
        let pikpak = document.getElementById('pikpak-expand-share');
        if(!pikpak) {
            let html = `
                <div id="pikpak-expand-share" style="position:absolute;user-select: none;background:#fff;left:${x}px;top: ${y + 12}px;">
                    <div class="pikpak-icon" style="display: flex;align-items:  center;background-color: #fff;box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05);color: rgb(51, 54, 57);padding: 10px 20px;border-radius: 3px;cursor: pointer;">保存到Pikpak</div> 
                </div>
            `
            document.body.insertAdjacentHTML('beforeend', html);
            pikpak = document.getElementById('pikpak-expand-share');
            pikpak.addEventListener('click',handlePikpakClick)
        } else {
            pikpak.style.left = x + 'px';
            pikpak.style.top = y + 12 + 'px';
        }
    }
    /**
     * 隐藏pikpak
     * @param {Event} e
    **/
    const hidePikPak = (e) => {
        let pikpak = document.getElementById('pikpak-expand-share');
        if(pikpak) {
            pikpak.removeEventListener('click', handlePikpakClick)
            pikpak.remove();
        }
    }
    /**
     * 弹窗提示
     * @param {String} msg
     * @param {String} title
     * @param {String} type 
    **/
    const alertMsg = (msg, type = 'info') => {
        document.querySelector('.pikpak-alert-msg') && document.querySelector('.pikpak-alert-msg').remove();
        const html = `
            <div class="pikpak-alert-msg" style="z-index: 6000; position: fixed; height: 0; display: flex; align-items: center;top: 40px; left: 0; right: 0; flex-direction: column;">
                <div class="pikpak-alert-content" style="display: flex;align-items:  center;background-color: #fff;box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05);color: rgb(51, 54, 57);padding: 10px 20px;border-radius: 3px;">
                    ${type == 'error' ? '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAmFJREFUOE91UztoFFEUPfdN5m1CCsVCVHYmG8HMjIgK4gctBE1AIVUKU0bFJK2pU6hoIViEgBaCRWLAX7AJokYIMQGbJEVAksysn2XfprCzMMXOTPZdmXV3mXyc8rxzzj3vnTuEXb6g3TxBFXFRg3vBaAUwSeBPTile3E6nNPD9UIu12VR5wuAzxDQBxoQQYgOodGlQF0D7QdTnFsuFuq5hENjyDgN3AbrtqnB0t2S+Zd4A0QgBI46K7iWcqkFtsnJVtCXRbiYJ5ttyiZmGvVI4XRX4tpxiwiuvGL1IkoDhO6XoddpgzTZPCVB3MrmQaz0Q6njWkNFZyufMk1rTS1dFXiLIt8kezXhLxP1OMX6WYImYQEsAel0VvUmwwJZjTDxPgZUZYoEmtxg+qk/025ougcWMIOqusP61XVwzHRCMDvJt+QUG3XQLYZCOHFjmaSZa+PdQ3Oeo+Hn6PG83H9asP5BvyWVBoqdDlX+mCauWPCYIX2vYNVdFkzsMoOcSg/uCeL1DxU/rhG+2PFoBVhg8CBZFIv7I4OueisfrnDXbHCBQJ63mzHNC05Crot7kMBFrYEozP/BK8Vi1pfaMgwr7zHQlqa7xiMBqtcY1W+ahdb+3vjlXrZFo0SmG79ORCzk0l3Vm1FPhYCGHvaGWvw0Z7aka/MhmjsSC510VHfzf8qRx3zJnGeJhY5FqkZJV7oNBV7c3UhevZLHPEPIdAdNbVrnRf1Yeh8A4AcuaeQ6G8ZkYRKhcZqbOZJEIotNR5ZkdP1MdKGXRsiEytwTxeWZcACCIsaAJi9QSPXYD/Elf5y9qJgvqi3YkkgAAAABJRU5ErkJggg==">' : '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAdZJREFUOE+dU0FoE0EUfX/YBEFRdkq1iCCosyfvSqlg8SAUyVHEu4RMsZaiXq0oeJHWtuwuomfxatWDB0FBQUF7kAYhEwTBi4KzFjxoaPbLbBLZbDWBzmFgeP+9//+b/wmFI++ZA2jhNBMqBFQ6MH0A4ZH3W4TfZg99zVMo/5ChWQDxOWaqplR+taEPJg7fE332BbcmiPguQLetVgs93l8BGRlm8Eqig5liVX1J4uYSmGesVhk3u/y4eVUwT3zXqlvyIAlAxs0l5vRtooMHNBrWx9pUWrM62D+Y1o/KyLzZLLemaCQ0t1LBr5Na8GSYgB+Zd9zG5R8X1QsZfhwHecdJxqbOQown1cMbgwQcmQiPbU1dd3GjYX1XG+Wn5MzrGeIAGZp5O63m82JFcg+Tkfm5VSA215hxMtFqMjPYZQa/tzqobpmZTCA0L9kTlXwLfty4SSlOMNHO/5HzLcwxcaNooh+bkJi9f2XutNo1cff9uvRapfVtf2Onz8Z5InHM1o5cGvaVDh+JzGoKfpgNUs5RBtHyMBEZmUUAs32jnBOZA3CWkV5JsWO9b5nw66iAuMGMNTutXFxnT4sl773zad9mqX2mu86nHM7Ac2Ksooxn9oL6kuf8ATrI25FVBayhAAAAAElFTkSuQmCC"> '} 
                    &nbsp;&nbsp;${msg}
                </div>
            </div>
        `
        document.body.insertAdjacentHTML('beforeend', html);
        const alertMsg = document.querySelector('.pikpak-alert-msg');
        alertMsg.addEventListener('click', (e) => {
            alertMsg.remove();
        })
        setTimeout(() => {
            alertMsg && alertMsg.remove();
        }, 3000)
    }
    /**
     * 登陆请求
    **/
    const login = ({url, method, data, params}) => {
        console.log('登陆')
        document.querySelector('.pikpak-alert-login') && document.querySelector('.pikpak-alert-login').remove()
        document.querySelector('.pikpak-alert-msg') && document.querySelector('.pikpak-alert-msg').remove()
        return new Promise((resolve, reject) => {
            const html = `
                <div class="pikpak-alert-login" style="z-index: 6000; position: fixed; display: flex; align-items: center; flex-direction: column;top: 50%;left: 50%; text-align: center;  transform: translate(-50%, -50%);">
                    <div class="pikpak-alert-login-box" style="align-items: center;background-color: #fff;box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05);color: rgb(51, 54, 57);padding: 20px;border-radius: 3px;">
                        <div class="" style="margin-bottom: 10px;">
                            登陆
                        </div> 
                        <div class="">
                            <input type="text" style="line-height: 26px;padding: 4px; border: 1px solid #ddd; border-radius: 3px;  margin-bottom: 10px;  min-width: 200px; "  placeholder="用户名" name="username"></input>
                        </div>
                        <div class="">
                            <input type="password" style="line-height: 26px;padding: 4px;border: 1px solid #ddd; border-radius: 3px;  margin-bottom: 10px;  min-width: 200px; "  name="password" placeholder="密码"></input>
                        </div>
                        <div class="">
                            <button id="pikpak-alert-confirm" style="border: 1px solid #ddd; background-color: #428BCA; color: #fff; border-radius: 3px; padding: 6px 20px; margin-right: 10px;">确定</button>
                            <button id="pikpak-alert-cancle" style="border: 1px solid #ddd; background-color: transparent; border-radius: 3px; padding: 6px 20px; color: #666; ">取消</button>
                        <div>
                    </div>
                </div>
            `
            const maskHtml = `
                <div class="pikpak-alert-mask" style="position: fixed; left: 0; right: 0; top: 0; bottom: 0; background-color: rgba(0, 0, 0, .4);"></div>
            `
            document.body.insertAdjacentHTML('beforeend', html);
            document.body.insertAdjacentHTML('beforeend', maskHtml);
            const pikpakConfirm = document.querySelector('#pikpak-alert-confirm');
            pikpakConfirm.addEventListener('click', (e) => {
                const username = document.querySelector('.pikpak-alert-login input[name=username]').value;
                const password = document.querySelector('.pikpak-alert-login input[name=password]').value;
                document.querySelector('.pikpak-alert-login').remove();
                document.querySelector('.pikpak-alert-mask').remove();
                if (username && password) {
                    return pikpakXml({
                        method: 'POST',
                        url: 'https://user.mypikpak.com/v1/auth/signin',
                        data:{
                            "client_id": "YNxT9w7GMdWvEOKa",
                            "client_secret": "dbw2OtmVEeuUvIptb1Coyg",
                            "password": password,
                            "username": username
                        },
                    }).then(async res => {
                        const pikpakLogin = JSON.parse(res.responseText);
                        pikpakLogin.expires =  new Date().getTime() + pikpakLogin.expires_in * 1000;
                        GM_setValue('pikpakLoginInfo', JSON.stringify(pikpakLogin));
                        GM_registerMenuCommand('登出',() => {
                            logout()
                        })
                        GM_unregisterMenuCommand('登陆')
                        if (url) {
                            try {
                                await pikpakXml({url, method, data, params})
                                resolve(res)
                            } catch (error) {
                                console.log(error)
                                reject(error)
                            }
                        } else {
                            resolve(res)
                        }
                    })
                } else {
                    reject('请输入用户名和密码')
                }
            })
            const pikpakCancle = document.querySelector('#pikpak-alert-cancle');
            pikpakCancle.addEventListener('click', (e) => {
                document.querySelector('.pikpak-alert-login').remove();
                document.querySelector('.pikpak-alert-mask').remove();
                reject('取消登陆')
            })
        })
    }
    /**
     * 退出
     * @returns 
     */
    const logout = () => {
        pikpakXml({
            url: 'https://user.mypikpak.com/v1/auth/revoke',
            method: 'post',
            data: {}
        })
            .then(() => {
                GM_deleteValue('pikpakLoginInfo');
                GM_registerMenuCommand('登陆',() => {
                    login({})
                        .then(res => {
                            console.log(res)
                            alertMsg('登录成功')
                        })
                })
                GM_unregisterMenuCommand('登出')
                alertMsg('退出成功')
            })
    }
    /**
     * 刷新token
     * 
    */
    const refreshToken = () => {
        console.log('刷新token')
        const pikpakLogin = JSON.parse(GM_getValue('pikpakLoginInfo', '{}'));
        if(!pikpakLogin.refresh_token) {
            return false;
        }
        GM_xmlhttpRequest({
            url: 'https://user.mypikpak.com/v1/auth/token?client_id=YNxT9w7GMdWvEOKa',
            method: 'POST',
            data: JSON.stringify({
                "client_id":"YNxT9w7GMdWvEOKa",
                "client_secret":"dbw2OtmVEeuUvIptb1Coyg",
                "grant_type":"refresh_token",
                "refresh_token": pikpakLogin.refresh_token
            }),
            headers: {
                'user-agent': 'accessmode/ devicename/Netease_Mumu appname/android-com.pikcloud.pikpak cmd/login appid/ action_type/ clientid/YNxT9w7GMdWvEOKa deviceid/56e000d71f4660700ca974f2305171c5 refresh_token/ grant_type/ networktype/WIFI devicemodel/MuMu accesstype/ sessionid/ osversion/6.0.1 datetime/1636364470779 sdkversion/1.0.1.101600 protocolversion/200 clientversion/ providername/NONE clientip/ session_origin/ devicesign/div101.56e000d71f4660700ca974f2305171c5b94c3d4196a9dd74e49d7710a7af873d platformversion/10 usrno/null'
            },
            onload: (res) => {
                console.log(res);
                if(res.status === 200) {
                    const data = JSON.parse(res.responseText);
                    pikpakLogin.access_token = data.access_token;
                    pikpakLogin.refresh_token = data.refresh_token;
                    pikpakLogin.expires =  new Date().getTime() + data.expires_in * 1000;
                    GM_setValue('pikpakLoginInfo', JSON.stringify(pikpakLogin));
                }
            }
        })
    }
    /**
     * 异步post提交下载
     * 
    **/
    const postUrl = (url) => {
        let postData = {}
        if(url.indexOf('PikPak://') === 0) {
          const urlData = url.substring(9).split('|')
          postData = {
              kind: "drive#file",
              name: urlData[0],
              size: urlData[1],
              hash: urlData[2],
              upload_type: "UPLOAD_TYPE_RESUMABLE",
              objProvider: {
                  provider: "UPLOAD_TYPE_UNKNOWN"
              }
          }
        } else if(url.indexOf('magnet:?xt=urn') === 0) {
          postData = {
            kind: "drive#file",
            name: "",
            upload_type: "UPLOAD_TYPE_URL",
            url: {
              url: url
            },
            params: {"from":"file"},
            folder_type: "DOWNLOAD"
          }
        }
        return pikpakXml({
            method: 'POST',
            url: 'https://api-drive.mypikpak.com/drive/v1/files',
            data: postData,
        })
            .then(res => {
                console.log(res);
                alertMsg('添加成功')
            })
    }
    /**
     * 批量添加
     */
    const postUrlArray = (text) => {
        const urlList = text.split('\n')
        for(let i in urlList) {
            if(testUrl(urlList[i])) {
                postUrl(urlList[i])
            }
        }
    }
    /**
     * 异步pikpakXml
     */
    const pikpakXml = ({url, method='get', data, params}) => {
        method = method.toUpperCase()
        if(params) {
            url = url + (url.indexOf('?') === -1 ? '?' : '&') + Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')
        }
        const pikpakLogin = JSON.parse(GM_getValue('pikpakLoginInfo', '{}'))
        if((!pikpakLogin.access_token || pikpakLogin.expires < new Date().getTime()) && url.indexOf('v1/auth/signin') === -1) {
            return login({url, method, data, params})
        }
        if(pikpakLogin.expires < new Date().getTime() + 1000 * 10 * 60 && url.indexOf('v1/auth/token') === -1) {
            refreshToken()
        }
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method || 'GET',
                url: url,
                data: method === 'POST' && JSON.stringify(data),
                headers: {
                    authorization: pikpakLogin.token_type + ' ' + pikpakLogin.access_token
                },
                onload: (response) => {
                    console.log(response)
                    if(response.status === 200) {
                        resolve(response)
                    } else if(response.status === 401) {
                        return login({url, method, data, params})
                    } else if(response.status === 400) {
                        const msg = JSON.parse(response.responseText).error_description
                        alertMsg(msg, 'error')
                        reject(response)
                    }
                }
            })
        })
    }

    initPage()
})();
