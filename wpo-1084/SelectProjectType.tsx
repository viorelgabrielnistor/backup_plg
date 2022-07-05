import React, { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';

import { PROJECT_TYPES, PROJECT_TYPE } from '../../constants/project';
import useLocalStorage from '../../store/useLocalStorage';

import { ReactComponent as Chat } from '../../assets/images/Chat.svg';
import { ReactComponent as Case } from '../../assets/images/Case.svg';

import styles from './SelectProjectType.module.scss';

interface SelectProjectTypeButtonProps { 
  children: ReactNode; 
  type: PROJECT_TYPES; 
  isActive: boolean | null;
  onClick: (PROJECT_TYPES) => void;
}

const SelectProjectTypeButton: FC<SelectProjectTypeButtonProps> = ({ children, type, isActive, onClick }) =>{
  const handleOnClick = (): void =>{
    onClick(type);
  }

  return (
    <div className={ `${styles.projectTypeButtonWrapper} ${isActive === true ? styles.active : ''} ${isActive === false ? styles.inactive : ''}` } onClick={ handleOnClick }>
      {children}
      <div className={ styles.projectTypeButtonText }>
        <FormattedMessage id={ `label.badge.${type}` } />
      </div>
    </div>
  )
}

const SelectProjectType: FC<{ onChange: (PROJECT_TYPES) => void}> = ({ onChange }) => {
  const [projectType, setProjectType] = useState<PROJECT_TYPES | null>(null);
  
  const handleOnClick = (type: PROJECT_TYPES): void => {
    setProjectType(type);
    onChange(type);
  }

  const [, setStoredProjectType] = useLocalStorage<PROJECT_TYPES |null>(PROJECT_TYPE, null );
  useEffect(() => {
    setStoredProjectType( projectType );
  },[projectType])

  return (
    <div className="d-flex justify-content-around">
      <SelectProjectTypeButton type={ PROJECT_TYPES.CHAT } isActive={ projectType && projectType === PROJECT_TYPES.CHAT } onClick={ handleOnClick }>
        <Chat className={ styles.projectTypeButton } />
      </SelectProjectTypeButton>
      <SelectProjectTypeButton type={ PROJECT_TYPES.CASE } isActive={ projectType && projectType === PROJECT_TYPES.CASE } onClick={ handleOnClick }>
        <Case className={ styles.projectTypeButton } />
      </SelectProjectTypeButton>
    </div>
  )
}
export default SelectProjectType;
