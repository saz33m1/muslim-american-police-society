import { Banner } from '@payloadcms/ui/elements/Banner'
import React from 'react'

import { SITE_NAME } from '@/utilities/brand'
import './index.scss'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>Welcome to the {SITE_NAME} content dashboard</h4>
      </Banner>
      To get started, check out our guides on how to update and edit content:
      <ul className={`${baseClass}__instructions`}>
        <li>Post a Latest Update (Event, Statement, etc.)</li>
        <li>Edit a Team Member</li>
        <li>Create Photo Galleries</li>
        <li>Create a new Page</li>
      </ul>
    </div>
  )
}

export default BeforeDashboard
