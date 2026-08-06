/**
 * Persistent Nexus Core — answers "where are we right now?" from public facts.
 *
 * Shows product identity, public round ordinal, and stage status. Timer digits
 * live in the Signal Rail / Final leaf so the countdown is not duplicated.
 */

import type { NexusCorePresentation } from './selectAudiencePresentation'

export interface NexusCoreProps {
  readonly nexus: NexusCorePresentation
}

export function NexusCore({ nexus }: NexusCoreProps) {
  return (
    <section className="nexus" data-testid="nexus-core" aria-label="Game status">
      <p className="nexus__brand" data-testid="nexus-brand">
        {nexus.brand}
      </p>
      {nexus.roundLabel !== null && (
        <p className="nexus__round" data-testid="nexus-round">
          {nexus.roundLabel}
        </p>
      )}
      <p className="nexus__stage" data-testid="nexus-stage">
        {nexus.stageLabel}
      </p>
      {nexus.detail !== null && nexus.detail.length > 0 && (
        <p className="nexus__detail" data-testid="nexus-detail">
          {nexus.detail}
        </p>
      )}
    </section>
  )
}
