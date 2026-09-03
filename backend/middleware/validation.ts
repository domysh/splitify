import { Response, NextFunction } from 'express';
import typia, { TypeGuardError } from 'typia';
import { AddBoardAccess, AddBoardForm, AddCategory, AddMember, AddProduct, AddTransaction, AddUser, AuthRequest, ConfirmEmailChange, JwtPayload, LoginRequest, RequestEmailChange, VerifyOtpRequest, SetRegistrationMode, TransferBoardOwnership, UpdateBoardAccess, UpdateUser } from '../models/types';

const validateRequest = <T>(validator: (input: unknown) => T | Error) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      validator(req.body);
      next();
    } catch (error) {
      if (error instanceof TypeGuardError) {
        return res.status(400).json({ message: `${error.path} with '${error.value}' is invalid: expected ${error.expected}` });
      } else {
        return res.status(500).json({ message: 'Unexpected Error!' });
      }
    }
  };
};

export const validateAddBoard = validateRequest(typia.createAssert<AddBoardForm>())
export const validateAddCategory = validateRequest(typia.createAssert<AddCategory>());
export const validateAddMember = validateRequest(typia.createAssert<AddMember>());
export const validateAddProduct = validateRequest(typia.createAssert<AddProduct>());
export const validateAddTransaction = validateRequest(typia.createAssert<AddTransaction>());
export const validateAddUser = validateRequest(typia.createAssert<AddUser>());
export const validateUpdateUser = validateRequest(typia.createAssert<UpdateUser>());
export const validateAddBoardAccess = validateRequest(typia.createAssert<AddBoardAccess>());
export const validateBoardTransfer = validateRequest(typia.createAssert<TransferBoardOwnership>());
export const validateUpdateBoardAccess = validateRequest(typia.createAssert<UpdateBoardAccess>());
export const validateLogin = validateRequest((body: unknown) => {
  return body as any;
});
export const validateVerifyOtp = validateRequest(typia.createAssert<VerifyOtpRequest>())
export const validateRequestEmailChange = validateRequest(typia.createAssert<RequestEmailChange>())
export const validateConfirmEmailChange = validateRequest(typia.createAssert<ConfirmEmailChange>())

export const validateSetRegistrationMode = validateRequest(typia.createAssert<SetRegistrationMode>())
export const jwtValidator = typia.createAssertEquals<JwtPayload>();
