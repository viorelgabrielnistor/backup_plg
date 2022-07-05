import React, { FC, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import useSound from 'use-sound';

import useVerificationQueue from '../../store/websockets/useVerificationQueue';
import Spinner from 'react-bootstrap/Spinner';
import { ReactComponent as BellIcon } from '../../assets/images/Bell.svg';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import styles from './HeaderLanguageExpert.module.scss';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const alarm = require('../../assets/sounds/boop.mp3');

const HeaderLanguageExpert: FC<{}> = () => {
  const { verifyTicketsCount } = useVerificationQueue();
  const [volume, setVolume] = useState(0.3);
  const [play] = useSound <{volume: number }>(alarm, { volume });
  const [totalNumberOfTickets, setTotalNumberOfTickets] = useState(0);
  const [shake, setShake] = useState(false);
  let senseOfChange = 'onIncrease';
  const target = useRef(null);

  const animate = (): void => {
    setShake(true);
    setTimeout(() => setShake(false), 2000);
  }

  const blinkTab = (message: string ): void => {
    const oldTitle: string = document.title;
    let timeoutId: ReturnType<typeof setTimeout>  | null = null;
    const blink = (): void => {
      document.title = document.title === message ? ' ' : message;
    }; 
    const clear = (): any =>  { 
      for (let i = 0; i < 99999; i++) {
        window.clearInterval(i);
      }
      document.title = oldTitle;
      window.onmousemove = null;
      timeoutId = null;
    };

    if (!timeoutId) {
      timeoutId = setInterval(blink, 1000);
      window.onmousemove = clear;                                                           
    }
  };

  useEffect(() => {
    if (verifyTicketsCount !== null && totalNumberOfTickets && verifyTicketsCount < totalNumberOfTickets) { senseOfChange = 'onDecrease' }
    if (totalNumberOfTickets !== null && verifyTicketsCount && senseOfChange === 'onIncrease' && verifyTicketsCount >= totalNumberOfTickets) {
      play();
      animate();
      blinkTab('You have new tickets!')
    }
    verifyTicketsCount && setTotalNumberOfTickets(verifyTicketsCount);
  }, [verifyTicketsCount]);

  const switchVolume = (): void => {
    volume ? setVolume(0) : setVolume(0.3);
  }

  return (
    <div className={ styles.requestsWrapper }>
      <div className={ styles.casesWrapper }>
        <p className={ styles.queue }>
          <FormattedMessage id="label.header.verificationQueue"/>
        </p>
        <span className={ styles.cases }>
          <FormattedMessage id="label.header.casesPending"/>
        </span>
      </div>
      {
        verifyTicketsCount !== null ?
          <b className={ styles.ticketNr }>{ verifyTicketsCount }</b>
          :
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
            className="ml-2"
          />
      }
      <OverlayTrigger
        trigger="hover"
        delay={ { show: 0, hide: 500 } }
        placement="right"
        overlay={ <Tooltip id="sound-switch-button">
          <FormattedMessage id={ volume ? 'label.button.soundSwitchOn' : 'label.button.soundSwitchOff' } /> 
        </Tooltip> }
      >
        <button className={ styles.bell } ref={ target }>
          < BellIcon className = { shake  ?  `${styles.shake}` : ''  } onClick={ switchVolume }/>
          {/* < BellIcon className = { shake  ?  `${styles.shake}` : ''  }/> */}
        </button>
      </OverlayTrigger>
    </div>
  );
};

export default HeaderLanguageExpert;
