const request = require('request')
const fs = require('fs')

const CAPTCHA_ENDPOINTS = {
  request: 'http://2captcha.com/in.php',
  response: 'http://2captcha.com/res.php',
}

const API_KEY = ''

const POLL_INVERVAL_MS = 2000

const wait = (ms = 0) => new Promise((resolve) => setTimeout(() => resolve(), ms))

const getCaptchaResponseWithPolling = async (captchaId) => {
  console.log('getCaptchaResponse() - getting response, id:', captchaId)
  if (!captchaId?.length) {
    throw new Error('getCaptchaResponse() - 2Captcha Request ID Required.')
  }
  return await new Promise((resolve, reject) => {
    request.get(
      `${CAPTCHA_ENDPOINTS.response}?key=${API_KEY}&action=get&id=${captchaId}`,
      function (error, _, body) {
        if (error) return reject(error)
        // returns OK + captcha
        // e.g OK|6aEcev
        const [status, requestId] = body?.split('|')

        if (status !== 'OK') {
          reject(body)
          return
        }

        resolve(requestId)
      }
    )
  }).catch(async (error) => {
    console.log('getCaptchaResponse() Error: ', error)
    if (error === 'CAPCHA_NOT_READY') {
      await wait(POLL_INVERVAL_MS)
      console.log('getCaptchaResponse() trying again...:')
      return getCaptchaResponse(captchaId)
    }

    throw new Error(error)
  })
}

const requestCaptcha = (fileBase64) =>
  new Promise((resolve, reject) => {
    request.post(
      {
        url: CAPTCHA_ENDPOINTS.request,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        formData: {
          key: API_KEY,
          /**
           * This is taking in a stream, but not sure what the format is in
           * coreg.
           */
          file: fileBase64,
          numeric: 1,
          phrase: 0,
          regsense: 1,
          min_len: 0,
          max_len: 8,
          is_russian: 0,
          language: 0,
          calc: 0,
          question: 0,
          id_constructor: 0,
          header_acao: 1,
        },
      },
      function (error, _, body) {
        if (error) return reject(error)
        // returns OK + request-id
        // e.g OK|72430803607
        const [status, requestId] = body?.split('|')

        if (status !== 'OK') {
          reject(body)
          return
        }

        resolve(requestId)
      }
    )
  })

;(async function () {
  try {
    const base64File = fs.createReadStream('./test.png')

    const captchaRequestId = await requestCaptcha(base64File)

    const captchaCode = await getCaptchaResponseWithPolling(captchaRequestId)
    console.log('captchaCode: ', captchaCode)
  } catch (error) {
    // All possible error codes for both endpoints: https://2captcha.com/2captcha-api#error_handling
    console.log('error: ', error)
  }
})()
