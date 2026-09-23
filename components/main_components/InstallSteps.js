// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/InstallSteps.js
// The nine steps, as tiles.
//
// Each is the tile the About pane uses, laid on its side: the number in the
// caption face, the action in bold, one line of detail, and a picture where
// one has been taken. Flat, like About's — nothing here opens anything.
//
// Not a client component any more, 2026-09-22. It was one for the
// phone/laptop switch, which is gone, so the steps are plain HTML in the
// page's first response: readable before any JavaScript arrives, which is
// what somebody mid-install on a phone signal needs.
//
// The page says which pictures exist, because that is a filesystem question.
// The steps themselves live in library/install_guide.js.

import { STEPS } from '../../library/install_guide';

export default function InstallSteps({ shots = [] }) {
  return (
    <ol className="get-steps">
      {STEPS.map((step, i) => (
        <li className="ln-tile get-step" key={step.shot}>
          <span className="get-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <div className="get-step-words">
            <h2 className="get-head">{step.head}</h2>
            <p className="get-text">{step.text}</p>
            {shots[i] && (
              <figure className="get-shot">
                <img src={`/install/${step.shot}.png`} alt={step.head} loading="lazy" />
              </figure>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
