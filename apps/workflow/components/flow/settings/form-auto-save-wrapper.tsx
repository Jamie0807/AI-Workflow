'use client'

import { useEffect, useRef } from 'react'
import { Control, FieldValues, useWatch } from 'react-hook-form'

/**
 * 表单自动保存防抖延迟（毫秒）
 */
const AUTO_SAVE_DELAY = 500

/**
 * 使用 useWatch 的表单自动保存 Hook（推荐）
 * 通过 control 对象监听表单变化，避免父组件重新渲染
 *
 * @param control - react-hook-form 的 control 对象
 * @param onSave - 保存回调
 * @param enabled - 是否启用自动保存
 */
export function useFormAutoSaveWithControl<T extends FieldValues>(
    control: Control<T>,
    onSave?: (data: T) => void,
    enabled: boolean = true
) {
    // useWatch 只会在被监听的值变化时触发，不会导致父组件重新渲染
    const formData = useWatch({ control }) as T
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
    const lastSavedDataRef = useRef<string>('')
    const isFirstRenderRef = useRef(true)

    useEffect(() => {
        if (!enabled || !onSave) {
            return
        }

        // 首次渲染不保存
        if (isFirstRenderRef.current) {
            isFirstRenderRef.current = false
            lastSavedDataRef.current = JSON.stringify(formData)
            return
        }

        const currentDataStr = JSON.stringify(formData)

        // 检查数据是否真的变化了
        if (currentDataStr === lastSavedDataRef.current) {
            return
        }

        // 清除之前的定时器
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current)
        }

        // 设置新的定时器
        autoSaveTimerRef.current = setTimeout(() => {
            onSave(formData)
            lastSavedDataRef.current = currentDataStr
        }, AUTO_SAVE_DELAY)

        // 清理函数
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
            }
        }
    }, [formData, onSave, enabled])

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
            }
        }
    }, [])
}

/**
 * 表单自动保存 Hook（旧版，兼容保留）
 * @deprecated 推荐使用 useFormAutoSaveWithControl
 */
export function useFormAutoSave<T = any>(watch: T, onSave?: (data: T) => void, enabled: boolean = true) {
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
    const lastSavedDataRef = useRef<string>('')
    const isFirstRenderRef = useRef(true)

    useEffect(() => {
        if (!enabled || !onSave) {
            return
        }

        // 首次渲染不保存
        if (isFirstRenderRef.current) {
            isFirstRenderRef.current = false
            lastSavedDataRef.current = JSON.stringify(watch)
            return
        }

        const currentDataStr = JSON.stringify(watch)

        // 检查数据是否真的变化了
        if (currentDataStr === lastSavedDataRef.current) {
            return
        }

        // 清除之前的定时器
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current)
        }

        // 设置新的定时器
        autoSaveTimerRef.current = setTimeout(() => {
            onSave(watch)
            lastSavedDataRef.current = currentDataStr
        }, AUTO_SAVE_DELAY)

        // 清理函数
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
            }
        }
    }, [watch, onSave, enabled])

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
            }
        }
    }, [])
}
