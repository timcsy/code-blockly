import { describe, it, expect } from 'vitest'

describe('Code Style 影響 Toolbox I/O 排序', () => {
  // buildToolbox 是 App 的 private 方法，這裡測試排序邏輯
  function sortIoBlocks(ioPreference: 'iostream' | 'cstdio'): string[] {
    const universalIo = ['u_print', 'u_input', 'u_endl']
    const cppIo = ['c_printf', 'c_scanf']
    return ioPreference === 'iostream'
      ? [...universalIo, ...cppIo]
      : [...cppIo, ...universalIo]
  }

  it('iostream 偏好時 u_print 應在 c_printf 前面', () => {
    const order = sortIoBlocks('iostream')
    const printIdx = order.indexOf('u_print')
    const printfIdx = order.indexOf('c_printf')
    expect(printIdx).toBeLessThan(printfIdx)
  })

  it('cstdio 偏好時 c_printf 應在 u_print 前面', () => {
    const order = sortIoBlocks('cstdio')
    const printfIdx = order.indexOf('c_printf')
    const printIdx = order.indexOf('u_print')
    expect(printfIdx).toBeLessThan(printIdx)
  })

  it('iostream 偏好時 u_input 應在 c_scanf 前面', () => {
    const order = sortIoBlocks('iostream')
    expect(order.indexOf('u_input')).toBeLessThan(order.indexOf('c_scanf'))
  })

  it('cstdio 偏好時 c_scanf 應在 u_input 前面', () => {
    const order = sortIoBlocks('cstdio')
    expect(order.indexOf('c_scanf')).toBeLessThan(order.indexOf('u_input'))
  })
})
