'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
import styles from './personal-search.module.css'

/** Admin search presentation, shared by Personal page filters and picker menus. */
export const PersonalSearch = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function PersonalSearch({ className, ...props }, ref) {
    return <div className={styles.field} data-personal-search>
      <Search size={17} strokeWidth={1.8} aria-hidden="true" />
      <input {...props} className={className} type="search" ref={ref} />
    </div>
  }
)
