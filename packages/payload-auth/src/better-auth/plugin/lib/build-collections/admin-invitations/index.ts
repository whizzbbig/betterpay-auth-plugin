import { isAdminWithRoles } from '../utils/payload-access'
import { generateAdminInviteUrl } from '../../../payload/utils/generate-admin-invite-url'
import { getUrlBeforeChangeHook } from './hooks/get-url-before-change'
import { getAdminInviteUrlAfterReadHook } from './hooks/get-url-after-read'
import { baseSlugs, defaults } from '@/better-auth/plugin/constants'

import type { CollectionConfig } from 'payload'
import type { BetterAuthPluginOptions } from '../../../types'

export function buildAdminInvitationsCollection({
  incomingCollections,
  pluginOptions
}: {
  incomingCollections: CollectionConfig[]
  pluginOptions: BetterAuthPluginOptions
}): CollectionConfig {
  const generateAdminInviteUrlFn = pluginOptions.adminInvitations?.generateInviteUrl ?? generateAdminInviteUrl
  const adminInvitationSlug = pluginOptions.adminInvitations?.slug ?? baseSlugs.adminInvitations
  const adminRoles = pluginOptions.users?.adminRoles ?? [defaults.adminRole]
  const roles = pluginOptions.users?.roles ?? [defaults.userRole]
  const allRoleOptions = [...new Set([...adminRoles, ...roles])].map((role) => ({
    label: role
      .split(/[-_\s]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    value: role
  }))
  const existingAdminInvitationCollection = incomingCollections.find((collection) => collection.slug === adminInvitationSlug) as
    | CollectionConfig
    | undefined

  let adminInvitationsCollection: CollectionConfig = {
    ...existingAdminInvitationCollection,
    slug: adminInvitationSlug,
    admin: {
      defaultColumns: ['role', 'token', 'url'],
      useAsTitle: 'token',
      group: pluginOptions?.collectionAdminGroup ?? 'Auth',
      hidden: pluginOptions.adminInvitations?.hidden,
      ...existingAdminInvitationCollection?.admin
    },
    access: {
      create: isAdminWithRoles({ adminRoles }),
      read: isAdminWithRoles({ adminRoles }),
      delete: isAdminWithRoles({ adminRoles }),
      update: isAdminWithRoles({ adminRoles }),
      ...(existingAdminInvitationCollection?.access ?? {})
    },
    timestamps: true,
    fields: [
      {
        label: 'Role',
        name: 'role',
        type: 'select',
        options: allRoleOptions,
        required: true,
        defaultValue: pluginOptions.users?.defaultAdminRole ?? defaults.adminRole
      },
      {
        name: 'token',
        label: 'Token',
        index: true,
        type: 'text',
        admin: {
          readOnly: true,
          components: {
            afterInput: [
              {
                path: 'payload-auth/shared/payload/fields#GenerateUuidButton'
              }
            ]
          }
        },
        required: true
      },
      {
        name: 'url',
        label: 'URL',
        type: 'text',
        hooks: {
          beforeChange: [getUrlBeforeChangeHook()],
          afterRead: [
            getAdminInviteUrlAfterReadHook({
              generateAdminInviteUrlFn
            })
          ]
        },
        admin: {
          readOnly: true,
          components: {
            afterInput: [
              {
                path: 'payload-auth/shared/payload/fields#FieldCopyButton'
              }
            ]
          }
        },
        virtual: true
      }
    ]
  }

  if (pluginOptions.adminInvitations?.collectionOverrides) {
    adminInvitationsCollection = pluginOptions.adminInvitations.collectionOverrides({
      collection: adminInvitationsCollection
    })
  }

  return adminInvitationsCollection
}
