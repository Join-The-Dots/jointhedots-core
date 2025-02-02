import React, { useCallback } from 'react'

type PropsType = {
  title?: string
  value: string
  placeholder: string
  onChange?: (value: string) => void
}

export function InputText(props: PropsType) {
  const { title, value, placeholder, onChange } = props
  const change = useCallback((e) => {
    onChange(e.value)
  }, [onChange])
  return (<input
    style={{ border: 0 }}
    title={title}
    placeholder={placeholder}
    value={value}
    onChange={change}
  />)
}
