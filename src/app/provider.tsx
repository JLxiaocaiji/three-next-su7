import React, { useState } from 'react'

export const Provider = (props: { children: React.ReactNode }) => {
  return <>{props.children}</>
}