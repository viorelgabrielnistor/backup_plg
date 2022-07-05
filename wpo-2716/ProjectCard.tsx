import React, { FC, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';

import { ReactComponent as RightArrow } from '../../assets/images/RightArrow.svg';
import { ReactComponent as LanguagePairsIcon } from '../../assets/images/LanguagePairs.svg';

import { IProjectValues } from '../../services/projectInterface';
import { toPath } from '../../helpers';
import routePaths from '../../routes/routePaths';
import { useHistory, useLocation } from 'react-router';
import projectService from '../../services/project';
import { TGetLanguageName } from '../../store/useLanguages';

import styles from './ProjectCard.module.scss';

interface IProjectProps {
  clientId: string;
  details: IProjectValues;
  getLanguageName: TGetLanguageName;
}

const ProjectCard: FC<IProjectProps> = ({ details: { id, name, active, languagePairs, type }, clientId, getLanguageName }) => {
  const history = useHistory();
  const location = useLocation();
  const languagePairsNames = useMemo(
    () => projectService.getLanguagePairsNames(languagePairs, getLanguageName),
    [languagePairs, getLanguageName]
  );

  const handleGoToProject = (): void => {
    history.push({
      pathname: toPath(routePaths.admin.project, { clientId: clientId || '', projectId: id || '' }),
      state: location.state
    });
  };

  return (
    <div className={ styles.projectContainer } onClick={ handleGoToProject } >
      <h6 className="text-break">{ name }</h6>
      <div className="d-flex justify-content-between">
        <div>
          <div className="d-flex align-items-center mb-2">
            <span className={ `text-uppercase ${ styles.status } ${ active ? '' : styles.inactive }` }>
              <FormattedMessage id={ `label.status.${ active }` } />
            </span>
            <span className={ styles.dot } />
            <span className={ `text-uppercase ${ styles.type }` }>{ type }</span>
          </div>
          {
            !!languagePairsNames.length &&
            <div className={ styles.languagePairs }>
              <LanguagePairsIcon className={ styles.languagePairsIcon } />
              { languagePairsNames.join(', ') }
            </div>
          }
        </div>
        <div className="d-flex align-items-end" >
          <RightArrow className={ styles.rightArrow } />
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
