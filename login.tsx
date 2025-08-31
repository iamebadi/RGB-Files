import './Login.css';
import {ReactComponent as AppLogo} from "../../../assets/images/app-logo.svg";
import React, {ChangeEvent, useEffect, useRef, useState} from "react";
import TextFieldComponent from "../../../components/app-data-textfield/Textfield";
import ButtonComponent from "../../../components/app-data-button/Button";
import * as yup from "yup";
import {useFormik} from "formik";
import {CredentialUserModel} from "../../../model/classes/dto/stateModel/user/CredentialUserModel";
import {shallowEqual, useDispatch, useSelector} from "react-redux";
import {login} from "../../../stateManagement/actions/userAction";
import {RootState} from "../../../stateManagement/store";
import {useLocation, useNavigate} from "react-router-dom";
import {loadingManagement} from "../../../stateManagement/actions/loadingAction";
import {SecurityStateModel} from "../../../model/classes/dto/stateModel/SecurityModel";
import MessageStateModel from "../../../model/classes/dto/stateModel/common/MessageStateModel";
import {getSystemSetting} from "../../../stateManagement/actions/commonAction";
import {getCaptcha} from '../../../stateManagement/actions/securityAction';
import ErrorModel from "../../../model/classes/dto/ErrorModel";
import CookieUtils from "../../../utils/cookieUtils";
import {IKeyboardEvent} from '../../../model/interfaces/IKeyboardEvent';
import AlertComponent from "../../../components/app-data-alert/Alert";
import CommonUtils from "../../../utils/commonUtils";

const Login = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const user = useSelector((state: RootState) => {
        return state.baseInfoReducer;
    }, shallowEqual).userReducer;
    const {captcha} = useSelector((state: RootState): SecurityStateModel => {
        return state.securityReducer as SecurityStateModel;
    }, shallowEqual);
    const {systemParam} = useSelector((state: RootState) => {
        return state.baseInfoReducer;
    }, shallowEqual).systemParamReducer;
    const message = useSelector((state: RootState): MessageStateModel => {
        return state.messageReducer as MessageStateModel;
    }, shallowEqual);

    const [isSubmitForm, setIsSubmitForm] = useState<boolean>(false);
    const [messageType, setMessageType] = useState<string>(message.type);
    const [englishChar, setEnglishChar] = useState<boolean>(true);
    const prevMessageTypeRef = useRef<string>('');
    const prevMessageCodeRef = useRef<string | ErrorModel>('');
    const initialForm: CredentialUserModel = new CredentialUserModel();

    const validationSchema = yup.object().shape({
        username: yup.string().required('نام کاربری اجباری است'),
        password: yup.string().required('رمز عبور اجباری است'),
        captchaUserAnswer: yup.string().when([], {
            is: () => systemParam?.isCaptchaEnabled || prevMessageCodeRef.current === '2038',
            then: yup.string().required('کد امنیتی اجباری است'),
            otherwise: yup.string().notRequired(),
        }),

    });

    const formik = useFormik({
        initialValues: initialForm,
        onSubmit: async (values, {resetForm}) => {
            console.log("Detected Keyboard Language:", values.language);
            initialForm.username = values.username;
            initialForm.password = values.password;
            initialForm.captchaUserAnswer = systemParam?.isCaptchaEnabled ? values.captchaUserAnswer : '';
            initialForm.captchaExpectedAnswerHash = systemParam?.isCaptchaEnabled ? captcha?.answer : '';
            dispatch(login(initialForm));
        },
        validationSchema: validationSchema,
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const isEnglishChar = CommonUtils.isEnglishChar(e);

        formik.setFieldValue("language", isEnglishChar ? "انگلیسی" : <><span> فارسی </span> <span
            className={'orange-color'}> | </span> <span> سایر زبان ها </span></>);

        setEnglishChar(isEnglishChar);

        if (!isEnglishChar) {
            e.preventDefault();
        }
    };

    const handleSubmitForm = (): void => {
        setIsSubmitForm(true);
        formik.handleSubmit();
    }

    const getCaptchaInfo = (): void => {
        dispatch(getCaptcha())
    }

    useEffect(() => {
        dispatch(getSystemSetting());
        const listener = (event: IKeyboardEvent) => {
            if (event.key === "Enter" || event.key === "NumpadEnter") {
                handleSubmitForm();
            }
        };
        document.addEventListener("keydown", listener);
        return () => {
            document.removeEventListener("keydown", listener);
        };
    }, []);

    useEffect(() => {
        if (user.isLoggedIn) {
            navigate('/sokan/home');
        } else if (user.isLoggedIn === undefined) {
            CookieUtils.removeSecureCookie()
        } else {
            dispatch(loadingManagement(false));
        }
    }, [user.isLoggedIn]);

    useEffect(() => {
        prevMessageTypeRef.current = message.type;
        if (message.content instanceof ErrorModel) {
            prevMessageCodeRef.current = message.content.code;
        }
    }, [messageType]);

    useEffect(() => {
        setMessageType(message.type);
        if (message.type === undefined && prevMessageTypeRef.current === 'error' && systemParam?.isCaptchaEnabled) {
            getCaptchaInfo();
        }
        if (prevMessageCodeRef.current === '2026' && systemParam?.isCaptchaEnabled) {
            getCaptchaInfo();
        }
        if (message.content instanceof ErrorModel && message.content.code === '2038') {
            formik.setFieldValue('captchaUserAnswer', '');
        }
    }, [message.type]);

    useEffect(() => {
        if (systemParam?.isCaptchaEnabled)
            getCaptchaInfo();
    }, [systemParam?.isCaptchaEnabled]);

    useEffect(() => {
        window.history.pushState(null, document.title, window.location.href);
        window.addEventListener('popstate', function (event) {
            window.history.pushState(null, document.title, window.location.href);
        });
    }, [location]);

    return (
        <>

            <div className={'login-body'}>
                <div className="bg"></div>
                <div className="bg bg2"></div>
                <div className="bg bg3"></div>
                <div className="login-container">
                    <div className="login">
                        <form className={'login-panel'} autoComplete={'off'}>
                            <div className="img-container">
                                <a><AppLogo/></a>
                                <span>سامانه نووا</span>
                            </div>
                            <div className="form-container">
                                <div className='login-field'>
                                    {formik.values?.language && !englishChar ?
                                        <AlertComponent message={
                                            <>
                                                زبان صفحه کلید : <span
                                                className={'red-color'}>{formik.values.language}</span>
                                            </>
                                        } severity={'warning'} isDismissible={false}/>
                                        : null
                                    }
                                </div>

                                <div className='login-field'>
                                    <TextFieldComponent labelText='نام کاربری'
                                                        className={'text-right'}
                                                        name='username'
                                                        error={isSubmitForm && (formik.touched.username && Boolean(formik.errors.username))}
                                                        helperText={isSubmitForm && formik.touched.username && Boolean(formik.errors.username) ? formik.errors.username : null}
                                                        handler={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, value?: string) => {
                                                            formik.setFieldValue('username', value);
                                                        }}
                                                        autoFocus={true}
                                                        handleKeyDown={handleKeyDown}
                                    />
                                </div>
                                <div className='login-field'>
                                    <TextFieldComponent labelText='رمز عبور'
                                                        name='password'
                                                        error={isSubmitForm && (formik.touched.password && Boolean(formik.errors.password))}
                                                        helperText={isSubmitForm && formik.touched.password && Boolean(formik.errors.password) ? formik.errors.password : null}
                                                        handler={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, value?: string) => {
                                                            formik.setFieldValue('password', value);
                                                        }}
                                                        handleKeyPress={(event: IKeyboardEvent | KeyboardEvent) => {
                                                            if (event.key === 'Enter') {
                                                                handleSubmitForm();
                                                            }
                                                        }}
                                                        inputType={"password"}
                                                        disableClipboard={true}
                                                        handleKeyDown={handleKeyDown}
                                    />
                                </div>
                                {systemParam?.isCaptchaEnabled && (
                                    <div className='login-field'>
                                        <label>تصویر امنیتی</label>
                                        <div className={'col-equal'}>
                                            <TextFieldComponent labelText=''
                                                                name='captchaUserAnswer'
                                                                valueText={formik.values.captchaUserAnswer}
                                                                error={isSubmitForm && (formik.touched.captchaUserAnswer && Boolean(formik.errors.captchaUserAnswer))}
                                                                helperText={isSubmitForm && formik.touched.captchaUserAnswer && Boolean(formik.errors.captchaUserAnswer) ? formik.errors.captchaUserAnswer : null}
                                                                handler={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, value?: string) => {
                                                                    formik.setFieldValue('captchaUserAnswer', value);
                                                                }}
                                                                placeHolder={'کد امنیتی را وارد کنید'}
                                                                handleKeyDown={handleKeyDown}
                                            />
                                            <div className={'captcha'}>
                                                <img src={`data:image/png;base64, ${captcha?.image}`} height='45'/>
                                                <span className="material-icons-outlined icon-24px"
                                                      onClick={getCaptchaInfo}>restart_alt</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className='login-field'>
                                    <ButtonComponent text='ورود به سامانه' handleClick={handleSubmitForm}/>
                                </div>
                                {/*<div className="password-reset">*/}
                                {/*    <a>*/}
                                {/*        <span className="material-icons-outlined icon-18px">lock_reset</span>*/}
                                {/*        <span>بازیابی رمز عبور</span>*/}
                                {/*    </a>*/}
                                {/*</div>*/}
                            </div>
                        </form>
                    </div>
                    <div className={'intro'}>
                        <span className='material-icons-outlined icon-18px'>info</span>
                        <p>
                            سامانه نووا جهت فراهم آوردن انواع گزارشات کارت، تراکنش ها، حساب، اطلاعات مشتریان و صدور
                            انواع کارت
                            ها به صورت دسته ای و آنی پیاده سازی شده است.
                        </p>
                    </div>
                </div>
                <footer>
                    <p>تمامی حقوق متعلق به این سامانه برای شرکت خدمات انفورماتیک محفوظ می باشد.
                        Copyright {new Date().getFullYear()} ISC©</p>
                </footer>
            </div>
        </>
    )
}
export default Login;
