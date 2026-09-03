// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/InstallSteps.js
// The seven steps, and the phone/laptop switch above them.
//
// A client component for one reason: the switch. Everything else on the
// install page could be plain HTML, and mostly is — the step text is a
// constant, the screenshots are files. But which set of pictures is showing
// is a choice the reader makes, and it goes into the address bar as it
// changes (?on=phone, ?on=laptop) so that the link they copy afterwards opens
// on the same one. That is history.replaceState and not a navigation: the
// page does not need to re-render on the server to swap a word in a URL.
//
// Each step has one heading, one line, a time where it helps, and a slot for
// a picture. The steps themselves live in library/install_guide.js, because
// the install page needs them on the server too. It tells this component
// which pictures exist, because that is a filesystem question and this file
// does not have one.

'use client';
import { useState } from 'react';
import { DEPLOY_URL, SOURCE_URL, DEVICES, STEPS } from '../../library/install_guide';

export default function InstallSteps({ initial = 'phone', shots }) {
  const [device, setDevice] = useState(initial);

  function choose(next) {
    setDevice(next);
    const url = new URL(window.location.href);
    url.searchParams.set('on', next);
    window.history.replaceState(null, '', url);
  }

  return (
    <>
      <div className="get-toggle" role="group" aria-label="Which are you installing from?">
        {DEVICES.map(d => (
          <button key={d} type="button" aria-pressed={device === d} onClick={() => choose(d)}>
            {d === 'phone' ? 'On a phone' : 'On a laptop'}
          </button>
        ))}
      </div>

      <ol className="get-steps">
        {STEPS.map((step, i) => {
          const text = typeof step.text === 'string' ? step.text : step.text[device];
          const hasShot = shots?.[device]?.[i];
          return (
            <li className="get-step" key={step.shot}>
              <span className="get-num" aria-hidden="true">{i + 1}</span>
              <div>
                <h2 className="get-head">{step.head}</h2>
                {step.time && <p className="get-time">{step.time}</p>}
                <p className="get-text">{text}</p>
                {/* The button itself, under step one. The person reading this
                    page came for the steps and has no other button to press;
                    a sentence pointing at one on another page is a dead end. */}
                {i === 0 && <a href={DEPLOY_URL} className="get-cta get-cta--step">Make your own copy</a>}
                {hasShot && (
                  <figure className={'get-shot' + (device === 'phone' ? ' get-shot--phone' : '')}>
                    <img src={`/install/${device}/${step.shot}.png`} alt={`${step.head}, on a ${device}`} loading="lazy" />
                  </figure>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="get-foot">
        <p className="get-foot-help">
          <a href={`${SOURCE_URL}/issues`}>It didn’t work →</a> Tell me what happened. I read these.
        </p>
      </div>
    </>
  );
}
