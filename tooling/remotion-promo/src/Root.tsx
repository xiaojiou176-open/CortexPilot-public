import {Composition} from "remotion";
import {AgentcoderTeaser} from "./Teaser";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="AgentcoderTeaser"
        component={AgentcoderTeaser}
        width={1280}
        height={720}
        fps={30}
        durationInFrames={540}
        defaultProps={{}}
      />
    </>
  );
};
