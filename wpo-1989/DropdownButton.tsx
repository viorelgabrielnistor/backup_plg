import React, { FC, RefObject, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';

import useOutsideClick from '../../hooks/useOutsideClick';
import useLoggedUserData from '../../store/useLoggedUserData';

import { ReactComponent as Arrow } from '../../assets/images/ArrowTabs.svg';
import { ReactComponent as Rejected } from '../../assets/images/Rejected.svg';
import { USER_ROLES } from '../../constants';

import styles from './DropdownButton.module.scss';

const DropdownButton: FC<{ 
  onReassign: () => void; 
  onReassignToMe: () => void;
  onAbandonClick: () => void;
  hasOnlyReassign?: boolean;
  isScrolling: boolean;
  disabled?: boolean;
}> = ({ onReassign, onReassignToMe, onAbandonClick, hasOnlyReassign, isScrolling, disabled = false }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownStyles, setDropdownStyles] = useState({});
  const dropdownRef: RefObject<any> = useRef();
  const buttonRef: RefObject<any> = useRef();

  const handleButtonClick = (): void => {
    if (hasOnlyReassign) {
      onReassign();
      return;
    }
    setDropdownOpen(!dropdownOpen);
  };

  useOutsideClick(dropdownRef, () => {
    setDropdownOpen(false);
  });

  const { loggedUserData: { role } } = useLoggedUserData();
  const isNotAdmin = role !== USER_ROLES.ADMIN; 

  useEffect(() => {
    if (dropdownOpen) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      setDropdownStyles({
        top: buttonRect.top + buttonRect.height + 2,
        left: buttonRect.left,
        width: buttonRef.current.offsetWidth,
        display: 'inline-block',
      });
    } else {
      setDropdownStyles({});
    }
  }, [dropdownOpen]);

  useEffect(()=>{
    if (isScrolling) {
      setDropdownOpen(false);
    }
  }, [isScrolling])

  return <div className={ styles.dropdownWrapper } ref={ dropdownRef }>
    <button
      className={ `${styles.button}` }
      type="button"
      onClick={ handleButtonClick }
      disabled={ disabled }
      ref={ buttonRef }
    >
      <FormattedMessage id={ 'label.pendingTranslations.action' } />
      { !hasOnlyReassign &&
        <Arrow
          className={ `${ styles.arrow } ${ dropdownOpen ? styles.arrowUp : styles.arrowDown }` }
        />
      }
    </button>
    {
      dropdownOpen && 
      <div className={ styles.mainDropdownContent } style={ dropdownStyles }>
        <div
          className={ styles.menuItem }
          onClick={ () => { setDropdownOpen(false); onReassignToMe() } }
        >
          <FormattedMessage id="label.pendingTranslations.reAssignToMe" />
        </div>
        {
          isNotAdmin &&
             <div
               className={ styles.menuItem }
               onClick={ () => { setDropdownOpen(false); onReassign() } }
             >
               <FormattedMessage id="label.pendingTranslations.reAssignTo" />
             </div>
        }
        <div
          className={ `${styles.menuItem} ${styles.abandonBtn}` }
          onClick={ () => { setDropdownOpen(false); onAbandonClick() } }
        >
          <span className="mr-2">
            <Rejected />
          </span>
          <FormattedMessage id="label.pendingTranslations.abandon" />
        </div>
      </div>
    }
  </div>
}

export default DropdownButton;
