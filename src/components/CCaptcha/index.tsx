import "./index.scss";
import { ICaptchaKV, getCaptchaKey } from "@/pages/login/db";
import Taro, { useEffect, useState } from "@tarojs/taro";
import { View, Text } from "@tarojs/components";

import { AtToast } from "taro-ui";

import * as R from "ramda";
import classnames from "classnames";

interface ICaptchaProps {
  className?: string;
  style?: React.CSSProperties;
  retry: number;
  onChange?: (params: TCaptchaVal) => void;
  onClose?: () => void;
}

export type TCaptchaVal = {
  captchaVal: string;
  captchaKey: string;
};

const Captcha: (props: ICaptchaProps) => React.ReactElement = props => {
  const [loading, setLoading] = useState<Boolean>(false);
  const [challenge, setChallenge] = useState<ICaptchaKV>({});

  const [boxes, setBoxes] = useState<number[]>([]);
  const [tryTimes, setTryTimes] = useState(-1);

  useEffect(() => {
    if (tryTimes < props.retry) {
      setTryTimes(props.retry);
      refresh();
    }
  }, [tryTimes, props.retry]);

  const chooseBox = async (i: number) => {
    if (boxes.length < 3 && !boxes.includes(i)) {
      setBoxes([...boxes, i]);
    }
    if ([...boxes, i].length === 3) {
      let val: TCaptchaVal = {
        captchaVal: [...boxes, i].join(""),
        captchaKey: "" + challenge.captchaKey
      };
      props.onChange && props.onChange(val);
    }
  };

  const resetBoxes = () => {
    setBoxes([]);
  };

  const [isErr, setIsErr] = useState(false);

  const refresh = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    resetBoxes();
    let cp: ICaptchaKV | boolean = await getCaptchaKey().catch(e => {
      // Toast.fail("获取注册码失败");
      return false;
    });

    if (!cp) {
      setIsErr(true);
      return;
    }

    setIsErr(false);
    setChallenge(cp);
    setLoading(false);
  };

  if (loading) {
    return <AtToast isOpened={isErr} status="error" text="获取注册码失败" />;
  }

  return (
    <View className={classnames("captcha", props.className)}>
      <AtToast isOpened={isErr} status="loading" text="正在加载" />
      <View className="tips">
        <Text>
          请依次点击下图中的：{" "}
          {challenge.captchaProblemCode
            ? challenge.captchaProblemCode.split("").join("，")
            : ""}
        </Text>
        <View>
          <View
            onClick={resetBoxes}
            className={classnames("icon", "at-icon", "at-icon-trash")}
          />
          <View
            onClick={props.onClose}
            className={classnames("icon", "at-icon", "at-icon-close-circle")}
          />
        </View>
      </View>

      <View
        className="captchaChallenge"
        style={{
          backgroundImage: challenge.captchaKey
            ? `url(${challenge.captchaImgUrl})`
            : "unset"
        }}
      >
        {R.range(0, 6).map(num => (
          <View
            key={num}
            className="item"
            style={{
              backgroundColor: boxes.includes(num)
                ? "rgba(32, 32, 0, 0.1)"
                : "unset"
            }}
            onClick={() => chooseBox(num)}
          />
        ))}
      </View>
    </View>
  );
};

export default Captcha;
