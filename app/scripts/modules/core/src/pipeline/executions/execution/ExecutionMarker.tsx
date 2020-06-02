import React from 'react';
import ReactGA from 'react-ga';

import { IExecution, IExecutionStageSummary } from 'core/domain';
import { OrchestratedItemRunningTime } from './OrchestratedItemRunningTime';
import { duration } from 'core/utils/timeFormatters';

import { Application } from 'core/application/application.model';
import { ExecutionBarLabel } from '../../config/stages/common/ExecutionBarLabel';
import { ExecutionMarkerInformationPopover } from './ExecutionMarkerInformationPopover';
import { SETTINGS } from 'core/config/settings';

import './executionMarker.less';

export interface IExecutionMarkerProps {
  stage: IExecutionStageSummary;
  application: Application;
  execution: IExecution;
  active?: boolean;
  previousStageActive?: boolean;
  width: string;
  onClick: (stageIndex: number) => void;
}

export interface IExecutionMarkerState {
  duration: string;
  hydrated: boolean;
  contextStageIndex: number;
  contextTarget: Element;
  showingExecutionMarkerInformationPopover: boolean;
}

export class ExecutionMarker extends React.Component<IExecutionMarkerProps, IExecutionMarkerState> {
  private runningTime: OrchestratedItemRunningTime;

  constructor(props: IExecutionMarkerProps) {
    super(props);

    const { stage, execution } = props;

    this.state = {
      duration: duration(stage.runningTimeInMs),
      hydrated: execution.hydrated,
      contextStageIndex: null,
      contextTarget: null,
      showingExecutionMarkerInformationPopover: false,
    };
  }

  public componentDidMount() {
    this.runningTime = new OrchestratedItemRunningTime(this.props.stage, (time: number) =>
      this.setState({ duration: duration(time) }),
    );
  }

  public componentWillReceiveProps(nextProps: IExecutionMarkerProps) {
    this.runningTime.checkStatus(nextProps.stage);
  }

  public componentWillUnmount() {
    this.runningTime.reset();
  }

  private handleStageClick = (): void => {
    ReactGA.event({ category: 'Pipeline', action: 'Stage clicked (bar)' });
    this.props.onClick(this.props.stage.index);
  };

  private handleStageInformationClick = (event: any): void => {
    ReactGA.event({ category: 'Pipeline', action: 'Stage show context menu (bar)' });
    event.preventDefault();
    event.stopPropagation();
    this.showExecutionMarkerInformationPopover(this.props.stage.index, event);
  };

  private showExecutionMarkerInformationPopover = (stageIndex: number, event: any) => {
    this.setState({
      showingExecutionMarkerInformationPopover: true,
      contextStageIndex: stageIndex,
      contextTarget: event.target,
    });
  };

  private hideExecutionMarkerInformationPopover = () => {
    this.setState({
      showingExecutionMarkerInformationPopover: false,
      contextStageIndex: null,
      contextTarget: null,
    });
  };

  public render() {
    const { stage, application, execution, active, previousStageActive, width } = this.props;
    const stageType = (stage.activeStageType || stage.type).toLowerCase(); // support groups
    const markerClassName = [
      stage.type !== 'group' ? 'clickable' : '',
      'stage',
      'execution-marker',
      `stage-type-${stageType}`,
      `execution-marker-${stage.status.toLowerCase()}`,
      active ? 'active' : '',
      previousStageActive ? 'after-active' : '',
      stage.isRunning ? 'glowing' : '',
      stage.requiresAttention ? 'requires-attention' : '',
    ].join(' ');

    const TooltipComponent = stage.useCustomTooltip ? stage.labelComponent : ExecutionBarLabel;
    const MarkerIcon = stage.markerIcon;
    const stageContents = (
      <div className={markerClassName} style={{ width, backgroundColor: stage.color }} onClick={this.handleStageClick}>
        <span className="horizontal center middle">
          <MarkerIcon stage={stage} />
          <span className="duration">{this.state.duration}</span>
          {SETTINGS.feature.executionMarkerInformationPopover &&
            stage.status.toLowerCase() === 'terminal' && stage.type === 'pipeline' && (
              <i
                className="fa fa-info-circle"
                style={{
                  color: '#fff',
                  marginLeft: '2px',
                  fontSize: '.8em',
                  position: 'relative',
                  top: '-1px',
                }}
                onClick={this.handleStageInformationClick}
                key={`${execution.id}_${stage.id}`}
                data-id={`${execution.id}_${stage.id}`}
              />
            )}
        </span>
      </div>
    );
    return (
      <span>
        <TooltipComponent application={application} execution={execution} stage={stage} executionMarker={true}>
          {stageContents}
        </TooltipComponent>
        {this.state.showingExecutionMarkerInformationPopover && (
          <ExecutionMarkerInformationPopover
            application={application}
            target={this.state.contextTarget}
            execution={execution}
            onClose={this.hideExecutionMarkerInformationPopover}
            stage={execution.stageSummaries[this.state.contextStageIndex]}
          />
        )}
      </span>
    );
  }
}
