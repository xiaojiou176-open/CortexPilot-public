import {Composition} from "remotion";
import {CodeflowTeaser} from "./Teaser";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="CodeflowTeaser"
        component={CodeflowTeaser}
        width={1280}
        height={720}
        fps={30}
        durationInFrames={540}
        defaultProps={{}}
      />
    </>
  );
};
